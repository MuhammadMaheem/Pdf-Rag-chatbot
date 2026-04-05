import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_rag_service
from app.main import app
from app.schemas import ChatResponse, SourceChunk


class _FakeVectorStore:
    def __init__(self) -> None:
        self._items = [
            {
                "document_id": "doc-1",
                "filename": "sample.pdf",
                "chunks_created": 2,
            }
        ]

    def list_documents(self):
        return self._items

    def delete_document(self, document_id: str) -> bool:
        if document_id != "doc-1":
            return False
        self._items = []
        return True


class _FakeRagService:
    def __init__(self) -> None:
        self.vector_store = _FakeVectorStore()

    def ingest_pdf(self, filename: str, file_bytes: bytes):
        return {
            "document_id": "doc-uploaded",
            "filename": filename,
            "chunks_created": 3,
        }

    def ask(self, query: str, top_k: int) -> ChatResponse:
        return ChatResponse(
            answer=f"mocked answer for {query}",
            latency_ms=25,
            sources=[
                SourceChunk(
                    chunk_id="chunk-1",
                    source="sample.pdf",
                    page=1,
                    score=0.9,
                    content="Important context",
                )
            ],
        )


@pytest.fixture(autouse=True)
def reset_dependencies():
    """Reset dependency overrides before and after each test."""
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_upload_pdf_endpoint() -> None:
    app.dependency_overrides[get_rag_service] = lambda: _FakeRagService()
    client = TestClient(app)

    response = client.post(
        "/api/v1/documents",
        files={"file": ("sample.pdf", b"%PDF-1.4\n%%EOF", "application/pdf")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["document_id"] == "doc-uploaded"
    assert payload["chunks_created"] == 3


def test_upload_rejects_non_pdf() -> None:
    app.dependency_overrides[get_rag_service] = lambda: _FakeRagService()
    client = TestClient(app)

    response = client.post(
        "/api/v1/documents",
        files={"file": ("sample.txt", b"just text", "text/plain")},
    )

    assert response.status_code == 400


def test_upload_rejects_empty() -> None:
    app.dependency_overrides[get_rag_service] = lambda: _FakeRagService()
    client = TestClient(app)

    response = client.post(
        "/api/v1/documents",
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )

    assert response.status_code == 400


def test_list_and_delete_document() -> None:
    app.dependency_overrides[get_rag_service] = lambda: _FakeRagService()
    client = TestClient(app)

    list_response = client.get("/api/v1/documents")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    delete_response = client.delete("/api/v1/documents/doc-1")
    assert delete_response.status_code == 200
    assert delete_response.json()["deleted"] is True

    missing_delete = client.delete("/api/v1/documents/missing")
    assert missing_delete.status_code == 404


def test_chat_endpoint() -> None:
    app.dependency_overrides[get_rag_service] = lambda: _FakeRagService()
    client = TestClient(app)

    response = client.post(
        "/api/v1/chat",
        json={"query": "What is inside this document?", "top_k": 3},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["answer"].startswith("mocked answer")
    assert payload["sources"][0]["source"] == "sample.pdf"


def test_health_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
