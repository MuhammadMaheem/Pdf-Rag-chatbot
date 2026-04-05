from __future__ import annotations

import logging
import time
import uuid

from app.schemas import ChatResponse, SourceChunk
from app.services.embedding_service import EmbeddingService
from app.services.faiss_store import FaissStore
from app.services.groq_client import GroqClient
from app.services.pdf_processor import PdfProcessor

logger = logging.getLogger(__name__)


class RagService:
    def __init__(
        self,
        pdf_processor: PdfProcessor,
        embedding_service: EmbeddingService,
        vector_store: FaissStore,
        groq_client: GroqClient,
    ) -> None:
        self.pdf_processor = pdf_processor
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.groq_client = groq_client

    def ingest_pdf(self, filename: str, file_bytes: bytes) -> dict:
        chunks = self.pdf_processor.extract_chunks(file_bytes)
        if not chunks:
            raise ValueError("No readable text found in uploaded PDF")

        doc_id = str(uuid.uuid4())
        store_rows: list[dict] = []
        texts: list[str] = []
        for item in chunks:
            chunk_id = f"{doc_id}-{item.chunk_id}"
            store_rows.append(
                {
                    "document_id": doc_id,
                    "chunk_id": chunk_id,
                    "source": filename,
                    "page": item.page,
                    "content": item.content,
                }
            )
            texts.append(item.content)

        logger.info("Extracted %d chunks from %s", len(chunks), filename)
        vectors = self.embedding_service.embed_many(texts)
        self.vector_store.upsert_document(doc_id, filename, store_rows, vectors)

        return {
            "document_id": doc_id,
            "filename": filename,
            "chunks_created": len(store_rows),
        }

    def ask(self, query: str, top_k: int) -> ChatResponse:
        started = time.perf_counter()
        query_vector = self.embedding_service.embed_one(query)
        hits = self.vector_store.search(query_vector, top_k)

        if hits:
            context = "\n\n".join(
                [
                    f"[{hit['source']} p.{hit['page']}] {hit['content']}"
                    for hit in hits
                ]
            )
            answer = self.groq_client.answer_with_context(query, context)
        else:
            answer = "I could not find relevant context in the uploaded documents."

        latency_ms = int((time.perf_counter() - started) * 1000)
        sources = [SourceChunk(**hit) for hit in hits]
        logger.info("Chat query: %d hits, %dms", len(hits), latency_ms)
        return ChatResponse(answer=answer, sources=sources, latency_ms=latency_ms)
