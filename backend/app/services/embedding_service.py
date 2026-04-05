from __future__ import annotations

import hashlib
import logging

import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._model = None
        self._dimension = 384

    @property
    def dimension(self) -> int:
        return self._dimension

    def _ensure_model(self) -> None:
        if self._model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(self.model_name)
            self._dimension = int(self._model.get_sentence_embedding_dimension())
            logger.info("Loaded embedding model: %s (dim=%d)", self.model_name, self._dimension)
        except Exception:
            logger.warning("Failed to load embedding model %s, using deterministic fallback", self.model_name)
            self._model = None
            self._dimension = 384

    def embed_many(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self._dimension), dtype="float32")

        self._ensure_model()
        if self._model is None:
            return np.vstack([self._fallback_embed(text) for text in texts]).astype("float32")

        vectors = self._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return vectors.astype("float32")

    def embed_one(self, text: str) -> np.ndarray:
        if not text:
            return np.zeros(self._dimension, dtype="float32")
        result = self.embed_many([text])
        if result.shape[0] == 0:
            return np.zeros(self._dimension, dtype="float32")
        return result[0]

    def _fallback_embed(self, text: str) -> np.ndarray:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        seed = int.from_bytes(digest[:8], byteorder="big", signed=False)
        rng = np.random.default_rng(seed)
        vec = rng.random(self._dimension, dtype=np.float32)
        norm = float(np.linalg.norm(vec))
        if norm == 0.0:
            return vec
        return vec / norm
