"""Guarded LLM explanation generator with deterministic fallback safeguard."""

from typing import Any, Callable, Dict


def generate_guarded_explanation(
    finding_dict: Dict[str, Any],
    llm_callable: Callable[[str], str],
) -> str:
    """Generate a plain-English explanation of a regression finding guarded against hallucinations.

    Constructs a prompt with deterministic finding statistics, calls the provided LLM
    callable, and verifies that the output strictly references the suspected component
    and formatted culprit score. If the output fails verification or the callable raises
    an exception, gracefully falls back to the deterministic finding['reason'].

    Args:
        finding_dict (Dict[str, Any]): Finding document from MongoDB containing:
            suspectedComponent (str), score (float), baselineVersionId (str),
            versionId (str), and reason (str).
        llm_callable (Callable[[str], str]): Function accepting prompt and returning LLM text.

    Returns:
        str: Verified LLM-generated explanation or deterministic fallback reason.
    """
    fallback_reason = finding_dict.get("reason", "")
    suspected_comp = str(finding_dict.get("suspectedComponent", ""))
    score = finding_dict.get("score", 0.0)
    score_formatted = f"{score:.2f}"
    baseline_id = finding_dict.get("baselineVersionId", "")
    version_id = finding_dict.get("versionId", "")

    prompt = (
        f"Explain the regression from baseline version {baseline_id} to version {version_id} "
        f"in 1-2 clear, plain-English sentences. "
        f"The suspected culprit component is '{suspected_comp}' with a confidence score of {score_formatted}. "
        f"Deterministic context: {fallback_reason}\n"
        f"You MUST include the exact component name '{suspected_comp}' and score '{score_formatted}' in your summary."
    )

    try:
        llm_output = llm_callable(prompt)
        if not isinstance(llm_output, str):
            return fallback_reason

        # Guard checks: output must include suspectedComponent and formatted score
        if suspected_comp not in llm_output or score_formatted not in llm_output:
            return fallback_reason

        return llm_output.strip()
    except Exception:
        # Fallback deterministically on any network or execution failure
        return fallback_reason
