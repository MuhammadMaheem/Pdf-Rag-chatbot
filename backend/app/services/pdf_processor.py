from __future__ import annotations

import logging
from dataclasses import dataclass
from io import BytesIO

from pypdf import PdfReader

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    chunk_id: str
    content: str
    page: int


class PdfProcessor:
    def __init__(self, chunk_size: int = 1000, overlap: int = 200) -> None:
        if overlap >= chunk_size:
            raise ValueError("overlap must be smaller than chunk_size")
        self.chunk_size = chunk_size
        self.overlap = overlap

    def extract_chunks(self, file_bytes: bytes) -> list[TextChunk]:
        reader = PdfReader(BytesIO(file_bytes))
        chunks: list[TextChunk] = []
        for page_idx, page in enumerate(reader.pages):
            text = (page.extract_text() or "").strip()
            if not text:
                continue
            chunks.extend(self._chunk_text(text, page_idx + 1))
        logger.info("Extracted %d chunks from %d pages", len(chunks), len(reader.pages))
        return chunks

    def _chunk_text(self, text: str, page: int) -> list[TextChunk]:
        normalized = " ".join(text.split())
        if not normalized:
            return []

        items: list[TextChunk] = []
        start = 0
        part = 0
        stride = self.chunk_size - self.overlap
        while start < len(normalized):
            end = start + self.chunk_size
            raw = normalized[start:end]
            if not raw:
                break
            split = raw.rfind(" ")
            if split > 0 and end < len(normalized):
                raw = raw[:split]
            raw = raw.strip()
            if raw:
                items.append(TextChunk(chunk_id=f"p{page}-c{part}", content=raw, page=page))
                part += 1
            start += stride
        return items
