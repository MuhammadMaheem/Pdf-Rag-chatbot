from __future__ import annotations

import logging

from groq import Groq

logger = logging.getLogger(__name__)


class GroqClient:
    def __init__(self, api_key: str, model_name: str) -> None:
        self.model_name = model_name
        self._enabled = bool(api_key)
        self._client = Groq(api_key=api_key, timeout=30.0) if self._enabled else None

    def answer_with_context(self, query: str, context: str) -> str:
        if not self._enabled or self._client is None:
            return "Groq API key is not configured. Set GROQ_API_KEY in backend/.env."

        system_prompt = (
            "You are a retrieval-grounded assistant. "
            "Only answer from the provided context. "
            "If context is insufficient, say so clearly."
        )
        message = f"Context:\n{context}\n\nUser question: {query}"

        try:
            response = self._client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                temperature=0.2,
                max_tokens=1500,
            )
        except Exception as exc:
            logger.error("Groq API call failed: %s", exc)
            raise

        if not response.choices:
            logger.warning("Groq response has no choices field")
            return "No answer generated."

        return response.choices[0].message.content or "No answer generated."
