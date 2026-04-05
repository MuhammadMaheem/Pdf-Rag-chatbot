import asyncio
import os
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import get_settings
from app.dependencies import get_rag_service
from app.schemas import (
    ChatRequest,
    ChatResponse,
    DeleteDocumentResponse,
    DocumentSummary,
    DocumentUploadResponse,
    HealthResponse,
)
from app.services.rag_service import RagService

router = APIRouter()


def _is_valid_pdf(file_bytes: bytes) -> bool:
    """Check if file starts with PDF magic bytes."""
    return len(file_bytes) >= 4 and file_bytes[:4] == b"%PDF"


def _sanitize_filename(filename: str) -> str:
    """Strip path components and unsafe characters from filename."""
    basename = os.path.basename(filename)
    safe = "".join(c for c in basename if c.isalnum() or c in ("-", "_", "."))
    return safe or "document.pdf"


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(service=settings.app_name)


@router.post("/documents", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    rag_service: RagService = Depends(get_rag_service),
) -> DocumentUploadResponse:
    settings = get_settings()

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if not _is_valid_pdf(file_bytes):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    size_limit = settings.max_upload_mb * 1024 * 1024
    if len(file_bytes) > size_limit:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_mb}MB limit")

    safe_filename = _sanitize_filename(file.filename or "document.pdf")

    try:
        uploaded = await asyncio.to_thread(rag_service.ingest_pdf, safe_filename, file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return DocumentUploadResponse(**uploaded)


@router.get("/documents", response_model=list[DocumentSummary])
async def list_documents(rag_service: RagService = Depends(get_rag_service)) -> list[DocumentSummary]:
    rows = rag_service.vector_store.list_documents()
    return [DocumentSummary(**row) for row in rows]


@router.delete("/documents/{document_id}", response_model=DeleteDocumentResponse)
async def delete_document(
    document_id: str,
    rag_service: RagService = Depends(get_rag_service),
) -> DeleteDocumentResponse:
    deleted = rag_service.vector_store.delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return DeleteDocumentResponse(deleted=True)


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, rag_service: RagService = Depends(get_rag_service)) -> ChatResponse:
    return await asyncio.to_thread(rag_service.ask, payload.query, payload.top_k)
