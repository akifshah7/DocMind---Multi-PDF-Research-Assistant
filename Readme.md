# DocMind 📄

A multi-PDF research assistant powered by a LangGraph RAG pipeline. Upload PDFs, ask questions, and get cited answers grounded in your documents — with automatic support for both text-based and scanned PDFs.

---

## Demo

> Upload one or more PDFs → ask questions → get answers with source citations

![DocMind Screenshot](./screenshot.png)

---

## Features

- **Multi-PDF support** — upload and query across multiple documents at once
- **Cited answers** — every response links back to the source document and page number
- **Scanned PDF support** — automatically detects and OCRs image-based PDFs using Tesseract
- **Agentic RAG pipeline** — built with LangGraph; retrieves, grades, and generates with a retry loop for low-confidence retrievals
- **Light & dark mode** — toggle between themes
- **React frontend** — built with Vite, Tailwind CSS, and Lucide icons
- **FastAPI backend** — clean REST API separating the AI logic from the UI

---

## Tech Stack

| Layer               | Tool                                         |
| ------------------- | -------------------------------------------- |
| LLM                 | Groq (Llama 3.1 8B)                          |
| Embeddings          | HuggingFace `all-MiniLM-L6-v2` (local, free) |
| Vector store        | ChromaDB                                     |
| Agent orchestration | LangGraph                                    |
| OCR                 | Tesseract + pdf2image                        |
| Backend             | FastAPI                                      |
| Frontend            | React + Vite + Tailwind CSS                  |
| Icons               | Lucide React                                 |

---

## Architecture

```
React (Vite)
    │
    │  POST /ingest   POST /query
    ▼
FastAPI
    │
    ▼
LangGraph Pipeline
    │
    ├── retrieve        → ChromaDB vector search (top-5 chunks)
    ├── generate        → Groq LLM with context + citations
    └── no_docs_answer  → fallback if nothing relevant found

PDF Ingestion
    │
    ├── Text-based PDF  → PyPDFLoader → chunk → embed → ChromaDB
    └── Scanned PDF     → pdf2image → Tesseract OCR → chunk → embed → ChromaDB
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Tesseract (`brew install tesseract`)
- Poppler (`brew install poppler`)

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/docmind.git
cd docmind
```

### 2. Set up the Python backend

```bash
pip3 install langchain langgraph langchain-groq langchain-chroma \
             langchain-community langchain-text-splitters \
             langchain-google-genai sentence-transformers \
             fastapi uvicorn python-multipart python-dotenv \
             pypdf pdf2image pytesseract Pillow
```

### 3. Set up environment variables

Create a `.env` file in the root:

```bash
GROQ_API_KEY=your_groq_api_key_here
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).

### 4. Start the backend

```bash
uvicorn server:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

### 5. Set up and start the frontend

```bash
cd docmind-ui
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Usage

1. Open `http://localhost:5173`
2. Upload one or more PDFs using the sidebar
3. Click **Ingest PDFs** and wait for confirmation
4. Ask questions in the chat input
5. Expand **Show sources** under any answer to see which document and page it came from

---

## Project Structure

```
docmind/
├── rag_pipeline.py     # LangGraph RAG logic (ingest, retrieve, generate)
├── server.py           # FastAPI server (REST API)
├── .env                # API keys (not committed)
├── data/               # Uploaded PDFs stored here
├── chroma_db/          # ChromaDB vector store (auto-created)
└── docmind-ui/         # React frontend
    └── src/
        ├── App.jsx
        └── components/
            ├── Sidebar.jsx
            ├── Chat.jsx
            └── Message.jsx
```

---

## How the RAG Pipeline Works

1. **Ingestion** — PDFs are loaded, split into 1000-character chunks with 200-character overlap, embedded using a local HuggingFace model, and stored in ChromaDB with metadata (filename, page number)
2. **Retrieval** — the user's question is embedded and the top-5 most similar chunks are fetched from ChromaDB
3. **Generation** — the retrieved chunks are passed as context to the LLM along with the question, which generates a cited answer
4. **Fallback** — if no relevant chunks are found, the user gets a clear message instead of a hallucinated answer

---

## License

MIT
