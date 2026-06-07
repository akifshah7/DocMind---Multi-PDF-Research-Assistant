import os
import shutil
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag_pipeline import ingest_pdfs, query

app = FastAPI(title="DocMind API")

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allows the React frontend to talk to this server

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://doc-mind-multi-pdf-research-assista.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request/Response models ───────────────────────────────────────────────────


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    answer: str
    sources: List[str]


# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/")
def root():
    return {"status": "DocMind API is running"}


@app.post("/ingest")
async def ingest(files: List[UploadFile] = File(...)):
    os.makedirs("data", exist_ok=True)
    pdf_paths = []

    for file in files:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} is not a PDF")
        path = os.path.join("data", file.filename)
        with open(path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        pdf_paths.append(path)

    try:
        chunk_count = ingest_pdfs(pdf_paths)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "message": f"Successfully ingested {len(pdf_paths)} PDF(s)",
        "chunks": chunk_count,
        "files": [f.filename for f in files],
    }


@app.post("/query", response_model=QueryResponse)
def query_docs(request: QueryRequest):
    """Run the LangGraph RAG pipeline and return answer + sources."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    result = query(request.question)
    return QueryResponse(answer=result["answer"], sources=result["sources"])
