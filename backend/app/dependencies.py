from functools import lru_cache

from app.config import get_settings
from app.services.embedding_service import EmbeddingService
from app.services.faiss_store import FaissStore
from app.services.groq_client import GroqClient
from app.services.pdf_processor import PdfProcessor
from app.services.rag_service import RagService


@lru_cache
def get_rag_service() -> RagService:
    settings = get_settings()
    pdf_processor = PdfProcessor()
    embedding_service = EmbeddingService(settings.embedding_model)
    vector_store = FaissStore(settings.vector_dir)
    groq_client = GroqClient(settings.groq_api_key, settings.groq_model)
    return RagService(pdf_processor, embedding_service, vector_store, groq_client)
