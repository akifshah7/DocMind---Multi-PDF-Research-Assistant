import os
from collections import defaultdict
from typing import List, TypedDict
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from langgraph.graph import StateGraph, END

load_dotenv()

# ── Models ────────────────────────────────────────────────────────────────────

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# ── Vector store ──────────────────────────────────────────────────────────────

CHROMA_PATH = "./chroma_db"


def get_vectorstore():
    return Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)


# ── PDF Ingestion ─────────────────────────────────────────────────────────────


def is_scanned_pdf(path: str) -> bool:
    """Check if a PDF is scanned (no extractable text)."""
    loader = PyPDFLoader(path)
    pages = loader.load()
    text = " ".join([page.page_content for page in pages])
    return len(text.strip()) < 100


def ocr_pdf(path: str) -> list:
    """Convert scanned PDF pages to images and run OCR on them."""
    from pdf2image import convert_from_path
    import pytesseract
    from langchain_core.documents import Document

    images = convert_from_path(path)
    documents = []

    for i, image in enumerate(images):
        text = pytesseract.image_to_string(image)
        if text.strip():
            documents.append(
                Document(
                    page_content=text,
                    metadata={"source": os.path.basename(path), "page": i, "ocr": True},
                )
            )

    return documents


def ingest_pdfs(pdf_paths: List[str]) -> int:
    """Load PDFs, chunk them, and store in ChromaDB. Returns chunk count."""
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

    all_chunks = []
    for path in pdf_paths:
        if is_scanned_pdf(path):
            print(f"[OCR] Detected scanned PDF: {path}")
            pages = ocr_pdf(path)
        else:
            print(f"[TEXT] Detected text-based PDF: {path}")
            loader = PyPDFLoader(path)
            pages = loader.load()

        chunks = splitter.split_documents(pages)
        for chunk in chunks:
            chunk.metadata["source"] = os.path.basename(path)
        all_chunks.extend(chunks)

    if not all_chunks:
        raise ValueError("No text could be extracted from the uploaded PDFs.")

    vectorstore = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)
    vectorstore.add_documents(all_chunks)
    return len(all_chunks)


# ── Vague question detection ──────────────────────────────────────────────────

VAGUE_PATTERNS = [
    "just uploaded", "last uploaded", "recently uploaded",
    "what did i upload", "what is the pdf", "what are my",
    "summarize all", "all documents", "all pdfs", "both pdf",
    "i uploaded", "uploaded about", "new pdf", "latest pdf",
    "what pdf", "give me a summary", "summarize the pdf",
]


def is_vague_question(question: str) -> bool:
    q = question.lower()
    return any(pattern in q for pattern in VAGUE_PATTERNS)


# ── Graph state ───────────────────────────────────────────────────────────────


class GraphState(TypedDict):
    question: str
    documents: List[str]
    sources: List[str]
    answer: str
    retry_count: int


# ── Graph nodes ───────────────────────────────────────────────────────────────


def retrieve(state: GraphState) -> GraphState:
    """Retrieve top-K relevant chunks from ChromaDB."""
    vectorstore = get_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    docs = retriever.invoke(state["question"])
    return {
        **state,
        "documents": [doc.page_content for doc in docs],
        "sources": [
            f"{doc.metadata.get('source', 'Unknown')} — page {doc.metadata.get('page', '?') + 1}"
            for doc in docs
        ],
    }


def retrieve_all(state: GraphState) -> GraphState:
    """Retrieve chunks from every ingested document (used for vague/meta questions)."""
    vectorstore = get_vectorstore()
    result = vectorstore.get(include=["documents", "metadatas"])

    by_source = defaultdict(list)
    for doc, meta in zip(result["documents"], result["metadatas"]):
        source = meta.get("source", "Unknown")
        by_source[source].append((doc, meta))

    docs = []
    sources = []
    for source, chunks in by_source.items():
        # Take up to 4 chunks per document to keep context manageable
        for doc, meta in chunks[:4]:
            docs.append(doc)
            sources.append(
                f"{source} — page {meta.get('page', 0) + 1}"
            )

    return {**state, "documents": docs, "sources": sources}


def route_question(state: GraphState) -> str:
    """Route to retrieve_all for vague questions, normal retrieve otherwise."""
    if is_vague_question(state["question"]):
        return "retrieve_all"
    return "retrieve"


def grade_documents(state: GraphState) -> GraphState:
    """Check if retrieved documents are relevant to the question."""
    grade_prompt = ChatPromptTemplate.from_template("""
    You are a grader. Given the question and a document, reply with only 'yes' if the document 
    is relevant to the question, or 'no' if it is not.
    
    Question: {question}
    Document: {document}
    """)

    chain = grade_prompt | llm | StrOutputParser()

    filtered_docs = []
    filtered_sources = []

    for doc, source in zip(state["documents"], state["sources"]):
        grade = chain.invoke({"question": state["question"], "document": doc})
        if "yes" in grade.lower():
            filtered_docs.append(doc)
            filtered_sources.append(source)

    return {**state, "documents": filtered_docs, "sources": filtered_sources}


def generate(state: GraphState) -> GraphState:
    """Generate an answer using retrieved context."""
    generate_prompt = ChatPromptTemplate.from_template("""
    You are a helpful assistant. Answer the question using only the provided context.
    If the context doesn't contain enough information, say so clearly.
    Always be specific and cite which document your answer comes from.

    Context:
    {context}

    Question: {question}

    Answer:
    """)

    chain = generate_prompt | llm | StrOutputParser()

    context = "\n\n".join(state["documents"])
    answer = chain.invoke({"context": context, "question": state["question"]})

    return {**state, "answer": answer}


def rephrase_query(state: GraphState) -> GraphState:
    """Rephrase the question for a better retrieval attempt."""
    rephrase_prompt = ChatPromptTemplate.from_template("""
    The following question did not return useful results. 
    Rephrase it to be more specific and clear for document retrieval.
    Return only the rephrased question, nothing else.
    
    Original question: {question}
    """)

    chain = rephrase_prompt | llm | StrOutputParser()
    new_question = chain.invoke({"question": state["question"]})

    return {
        **state,
        "question": new_question,
        "retry_count": state.get("retry_count", 0) + 1,
    }


def no_docs_answer(state: GraphState) -> GraphState:
    """Fallback when no relevant documents are found after retries."""
    return {
        **state,
        "answer": "I couldn't find relevant information in the uploaded documents to answer your question. Try rephrasing or uploading more relevant PDFs.",
        "sources": [],
    }


# ── Conditional edge ──────────────────────────────────────────────────────────


def decide_next(state: GraphState) -> str:
    """After grading: generate if we have docs, retry if not (max 2 retries)."""
    if state["documents"]:
        return "generate"
    elif state.get("retry_count", 0) < 2:
        return "rephrase"
    else:
        return "no_docs"


# ── Build graph ───────────────────────────────────────────────────────────────


def build_graph():
    graph = StateGraph(GraphState)

    graph.add_node("retrieve", retrieve)
    graph.add_node("retrieve_all", retrieve_all)
    graph.add_node("grade_documents", grade_documents)
    graph.add_node("generate", generate)
    graph.add_node("rephrase_query", rephrase_query)
    graph.add_node("no_docs_answer", no_docs_answer)

    # Route vague questions to retrieve_all, specific questions to retrieve
    graph.set_conditional_entry_point(
        route_question,
        {
            "retrieve_all": "retrieve_all",
            "retrieve": "retrieve",
        },
    )
    # retrieve_all skips grading — we trust it has relevant content
    graph.add_edge("retrieve_all", "generate")
    graph.add_edge("retrieve", "grade_documents")
    graph.add_conditional_edges(
        "grade_documents",
        decide_next,
        {
            "generate": "generate",
            "rephrase": "rephrase_query",
            "no_docs": "no_docs_answer",
        },
    )
    graph.add_edge("rephrase_query", "retrieve")
    graph.add_edge("generate", END)
    graph.add_edge("no_docs_answer", END)

    return graph.compile()


rag_graph = build_graph()


def query(question: str) -> dict:
    """Main entry point — run the RAG graph on a question."""
    result = rag_graph.invoke(
        {
            "question": question,
            "documents": [],
            "sources": [],
            "answer": "",
            "retry_count": 0,
        }
    )
    return {"answer": result["answer"], "sources": result["sources"]}
