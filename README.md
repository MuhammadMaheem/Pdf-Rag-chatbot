# PDF Knowledge Studio

A professional RAG-powered chatbot that indexes PDF documents into vectors and answers questions grounded in uploaded context. Built with FastAPI and React.

## Features

- **PDF Upload** — Upload PDF files, auto-extract text, chunk, embed, and store in FAISS vector index
- **Grounded Chat** — Ask contextual questions and get answers with source snippets (file name + page number)
- **Evidence Panel** — View retrieval sources alongside chat responses in a side-by-side layout
- **Document Management** — List, upload, and remove uploaded documents
- **Dark / Light Mode** — Persistent theme toggle
- **No Docker Required** — Runs natively on any machine with Python 3.11+ and Node.js

## Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI, FAISS, pypdf, sentence-transformers, Groq |
| **Frontend** | React 19 + Vite + TypeScript |
| **LLM** | `llama-3.3-70b-versatile` via Groq |
| **Embeddings** | `all-MiniLM-L6-v2` (384-dim, local) |

## Quick Start

### 1. Clone

```bash
git clone <your-repo-url>
cd Rag-Chatbot-pdf
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
```

Set your Groq API key:

```bash
cp .env.example .env
# Edit .env and set GROQ_API_KEY=your-key-here
```

### 3. Frontend

```bash
cd frontend
npm install
```

### 4. Run Everything

```bash
# From project root
./start.sh
```

This launches:
- **Backend** → `http://localhost:8000`
- **Frontend** → `http://localhost:5173`

Press `Ctrl+C` to stop all services.

### Manual Start

```bash
# Terminal 1 — Backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/documents` | Upload PDF (multipart) |
| `GET` | `/api/v1/documents` | List uploaded documents |
| `DELETE` | `/api/v1/documents/{id}` | Remove a document |
| `POST` | `/api/v1/chat` | Send a chat query |

### Chat Request

```json
{
  "query": "What does the document say about refunds?",
  "top_k": 5
}
```

### Chat Response

```json
{
  "answer": "Based on the document...",
  "sources": [
    {
      "chunk_id": "abc-123-p1-c0",
      "source": "policy.pdf",
      "page": 1,
      "score": 0.892,
      "content": "Refunds are available within 30 days..."
    }
  ],
  "latency_ms": 1240
}
```

## Configuration

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | *(empty)* | Your Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | LLM model to use |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model |
| `MAX_UPLOAD_MB` | `25` | Max PDF upload size |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS origins (comma-separated) |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Backend API URL |

## Testing

### Backend

```bash
cd backend
source .venv/bin/activate
pytest -v
```

### Frontend

```bash
cd frontend
npm run test      # Run tests
npm run lint      # ESLint
npm run build     # Production build
```

## Project Structure

```
Rag-Chatbot-pdf/
├── start.sh                  # Launch both services
├── .gitignore
├── README.md
│
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── config.py         # Pydantic settings
│   │   ├── routers.py        # API endpoints
│   │   ├── schemas.py        # Request/response models
│   │   ├── dependencies.py   # DI (RagService singleton)
│   │   └── services/
│   │       ├── pdf_processor.py      # PDF text extraction + chunking
│   │       ├── embedding_service.py  # Sentence-transformers embeddings
│   │       ├── faiss_store.py        # FAISS vector store + persistence
│   │       ├── groq_client.py        # Groq LLM wrapper
│   │       └── rag_service.py        # RAG pipeline orchestration
│   ├── tests/
│   ├── pyproject.toml
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── App.tsx                   # Main app (chat + docs pages)
    │   ├── styles.css                # All styles
    │   ├── types.ts                  # TypeScript types
    │   ├── services/api.ts           # API client
    │   ├── main.tsx                  # React entry point
    │   ├── App.test.tsx              # Component tests
    │   └── test/setup.ts             # Test setup
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    └── .env.example
```

## Architecture

```
User uploads PDF
    │
    ▼
Backend: Extract text (pypdf) → Chunk (1000 chars, 200 overlap)
    │
    ▼
Embed (SentenceTransformer) → Store in FAISS (cosine similarity)
    │
    ▼
User asks question
    │
    ▼
Embed query → Search FAISS (top_k) → Build context
    │
    ▼
Send context + question to Groq LLM → Return answer + sources
```

## Notes

- FAISS data is stored locally under `backend/data/vector_store/`
- If `GROQ_API_KEY` is not set, the chat endpoint returns a configuration message
- The embedding model runs locally — no external API needed for vector generation
- This MVP is single-user and local by design

## License

MIT
# Pdf-Rag-chatbot
