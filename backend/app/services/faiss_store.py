from __future__ import annotations

import json
import logging
from pathlib import Path

import faiss
import numpy as np

logger = logging.getLogger(__name__)


class FaissStore:
    def __init__(self, base_dir: str) -> None:
        self.base = Path(base_dir)
        self.base.mkdir(parents=True, exist_ok=True)
        self.index_path = self.base / "index.faiss"
        self.vectors_path = self.base / "vectors.npy"
        self.chunks_path = self.base / "chunks.json"
        self.docs_path = self.base / "documents.json"

        self._index = None
        self._vectors: np.ndarray | None = None
        self._chunks: list[dict] = []
        self._documents: dict[str, dict] = {}
        self._load()

    def _load(self) -> None:
        if self.docs_path.exists():
            self._documents = json.loads(self.docs_path.read_text(encoding="utf-8"))
        if self.chunks_path.exists():
            self._chunks = json.loads(self.chunks_path.read_text(encoding="utf-8"))
        if self.vectors_path.exists():
            self._vectors = np.load(self.vectors_path)
        if self.index_path.exists():
            self._index = faiss.read_index(str(self.index_path))
        elif self._vectors is not None and len(self._vectors) > 0:
            self._rebuild_index(self._vectors.shape[1])
        logger.info("Loaded FAISS store: %d documents, %d chunks", len(self._documents), len(self._chunks))

    def _persist(self) -> None:
        if self._vectors is not None and len(self._vectors) > 0:
            np.save(self.vectors_path, self._vectors)
        elif self.vectors_path.exists():
            self.vectors_path.unlink(missing_ok=True)

        self.chunks_path.write_text(json.dumps(self._chunks, ensure_ascii=False), encoding="utf-8")
        self.docs_path.write_text(json.dumps(self._documents, ensure_ascii=False), encoding="utf-8")

        if self._index is not None:
            faiss.write_index(self._index, str(self.index_path))
        elif self.index_path.exists():
            self.index_path.unlink(missing_ok=True)

    def _rebuild_index(self, dim: int) -> None:
        self._index = faiss.IndexFlatIP(dim)
        if self._vectors is not None and len(self._vectors) > 0:
            vectors = self._vectors.astype("float32").copy()
            faiss.normalize_L2(vectors)
            self._index.add(vectors)

    def upsert_document(self, doc_id: str, filename: str, chunks: list[dict], vectors: np.ndarray) -> None:
        if len(chunks) != len(vectors):
            raise ValueError("chunks and vectors length mismatch")

        if doc_id in self._documents:
            self.delete_document(doc_id)

        vectors = vectors.astype("float32").copy()
        faiss.normalize_L2(vectors)

        dim = vectors.shape[1]
        if self._vectors is None or len(self._vectors) == 0:
            self._vectors = vectors
        else:
            self._vectors = np.vstack([self._vectors, vectors])

        for chunk in chunks:
            self._chunks.append(chunk)

        self._documents[doc_id] = {
            "document_id": doc_id,
            "filename": filename,
            "chunks_created": len(chunks),
        }

        self._rebuild_index(dim)
        self._persist()
        logger.info("Upserted document %s (%s): %d chunks", doc_id, filename, len(chunks))

    def list_documents(self) -> list[dict]:
        return list(self._documents.values())

    def delete_document(self, doc_id: str) -> bool:
        if doc_id not in self._documents:
            return False

        keep_indices = [i for i, chunk in enumerate(self._chunks) if chunk["document_id"] != doc_id]
        self._chunks = [self._chunks[i] for i in keep_indices]

        if self._vectors is not None and len(self._vectors) > 0:
            self._vectors = self._vectors[keep_indices] if keep_indices else np.empty((0, self._vectors.shape[1]), dtype="float32")

        del self._documents[doc_id]

        if self._vectors is None or len(self._vectors) == 0:
            self._index = None
            self._vectors = None
        else:
            self._rebuild_index(self._vectors.shape[1])

        self._persist()
        logger.info("Deleted document %s", doc_id)
        return True

    def search(self, query_vector: np.ndarray, top_k: int) -> list[dict]:
        if self._index is None or self._vectors is None or len(self._vectors) == 0:
            return []

        query = query_vector.astype("float32").reshape(1, -1)
        faiss.normalize_L2(query)

        k = min(top_k, len(self._chunks))
        scores, indices = self._index.search(query, k)

        results: list[dict] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            chunk = self._chunks[int(idx)]
            results.append(
                {
                    "chunk_id": chunk["chunk_id"],
                    "source": chunk["source"],
                    "page": int(chunk["page"]),
                    "score": float(score),
                    "content": chunk["content"],
                }
            )
        return results
