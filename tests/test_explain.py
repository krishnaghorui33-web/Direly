"""Tests for Guarded LLM explanation generation (Review 2)."""

import pytest
from backend.app.analysis.explain import generate_guarded_explanation


@pytest.fixture
def mock_finding():
    """Sample finding dictionary from MongoDB findings collection."""
    return {
        "_id": "finding_abc_123",
        "projectId": "orderbot",
        "versionId": "B",
        "baselineVersionId": "A",
        "suspectedComponent": "tools",
        "score": 0.85,
        "confidence": "high",
        "status": "open",
        "evidenceRefs": ["ev_1234567890abcdef12345678"],
        "reason": "Changed tool 'get_order' with renamed parameter 'order_id' -> 'orderId' explaining 36 of 36 failed runs.",
    }


def test_guarded_explanation_valid_llm_response(mock_finding):
    """Verify valid LLM response containing suspectedComponent and formatted score is accepted."""
    def valid_llm(prompt: str) -> str:
        assert "tools" in prompt
        assert "0.85" in prompt
        return "The regression was caused by the tools component with a culprit score of 0.85."

    explanation = generate_guarded_explanation(mock_finding, valid_llm)
    assert explanation == "The regression was caused by the tools component with a culprit score of 0.85."


def test_guarded_explanation_hallucinated_missing_component_fallback(mock_finding):
    """Verify that hallucinated LLM response missing component name falls back to reason."""
    def hallucinating_llm(prompt: str) -> str:
        # Omits 'tools' (hallucinates prompt or generic explanation)
        return "The prompt change caused a failure with confidence score 0.85."

    explanation = generate_guarded_explanation(mock_finding, hallucinating_llm)
    assert explanation == mock_finding["reason"]


def test_guarded_explanation_hallucinated_missing_score_fallback(mock_finding):
    """Verify that LLM response missing exact formatted score falls back to reason."""
    def hallucinating_score_llm(prompt: str) -> str:
        # Contains 'tools' but hallucinates or rounds score differently (e.g. 0.90)
        return "The tools component is suspected with high probability."

    explanation = generate_guarded_explanation(mock_finding, hallucinating_score_llm)
    assert explanation == mock_finding["reason"]


def test_guarded_explanation_exception_fallback(mock_finding):
    """Verify that exception raised by LLM callable gracefully falls back to reason."""
    def failing_llm(prompt: str) -> str:
        raise ConnectionError("API rate limit exceeded")

    explanation = generate_guarded_explanation(mock_finding, failing_llm)
    assert explanation == mock_finding["reason"]
