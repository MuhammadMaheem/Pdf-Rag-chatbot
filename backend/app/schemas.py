from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)
    top_k: int = Field(default=5, ge=1, le=15)


class SourceChunk(BaseModel):
    chunk_id: str
    source: str
    page: int
    score: float
    content: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    latency_ms: int


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks_created: int


class DocumentSummary(BaseModel):
    document_id: str
    filename: str
    chunks_created: int


class DeleteDocumentResponse(BaseModel):
    deleted: bool
