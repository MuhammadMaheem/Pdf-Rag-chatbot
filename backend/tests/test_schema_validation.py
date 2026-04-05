import pytest
from pydantic import ValidationError

from app.schemas import ChatRequest


def test_chat_request_rejects_blank_query() -> None:
    with pytest.raises(ValidationError):
        ChatRequest(query="")


def test_chat_request_accepts_valid_payload() -> None:
    request = ChatRequest(query="What is in the document?", top_k=4)
    assert request.query.startswith("What")
    assert request.top_k == 4
