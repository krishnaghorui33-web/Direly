"""Deterministic injection of environment flakiness.

What lives here is simulated infrastructure, and only that:

  * INCIDENTAL TIMEOUTS model an unreliable upstream gateway stalling on a
    request that would otherwise have succeeded. They are simulated because a
    real network fault cannot be reproduced on demand.

What does NOT live here is the version B regression. That failure is not
injected and cannot be: it arises because the agent code sends "order_id" while
the B schema requires "orderId", so the call fails real argument validation in
agent/tools.py. No rule in this file can produce it. That is the entire point of
the demo -- Direly's verdict has to fall out of the stored evidence, not out of a
table that already knows which version is broken.

The flaky case is the same fault mechanism pointed at one case for one attempt:
c03 stalls on attempt 1 and succeeds on attempts 2 and 3. Because it alternates
within a single version, it is what flaky detection keys off, and it is what
keeps version A from looking artificially perfect.

Timeout wording is constrained. classify_error tests the invalid_tool_args
branch before the timeout branch, so a message containing "validation" or
"schema" would be filed as an argument error and pollute the evidence for the
tools suspect. These messages avoid both words.
"""

from typing import Dict, List, Optional, Set, Tuple

# Messages for injected gateway stalls. Free of "validation" and "schema".
TIMEOUT_MESSAGES = [
    "upstream gateway timed out after 30000ms",
    "upstream gateway timed out after 30000ms waiting for tool response",
    "upstream gateway timed out after 30000ms on upstream host",
]

# The tool that stalls when a timeout is injected. get_order is the interesting
# one because it is also the tool version B breaks, so the two failure modes stay
# cleanly separable by their error pattern.
TIMEOUT_TOOL = "get_order"

# (caseId, attempt) pairs that stall, per version.
#
# Version A: c03 attempt 1 is the genuinely flaky case (it also passes on
# attempts 2 and 3). c15/c19 are one-off stalls on otherwise-green cases.
# Version B: two incidental stalls on top of the 36 schema failures.
#
# Both counts are deliberately small. verify_fix takes the fingerprints covering
# the first 80% of a version's failures and asks how much of that set the fix
# cleared. If the timeout group ever grew to match the 36 invalid_tool_args
# failures, that group would join the top-fingerprint set, version C would
# clear only part of it, the ratio would fall under 0.80, and the verdict would
# flip from "resolved" to "remains" for a reason that has nothing to do with the
# regression. Keep the incidental group comfortably in the noise.
INCIDENTAL_TIMEOUTS: Dict[str, Set[Tuple[str, int]]] = {
    "A": {("c03", 1), ("c15", 2)},
    "B": {("c14", 2), ("c17", 3)},
    "C": set(),
}

# The case whose outcome alternates across attempts within version A.
FLAKY_CASE = "c03"


def timeout_for(version_id: str, case_id: str, attempt: int) -> Optional[str]:
    """Return the timeout message for a run, or None if it should not stall.

    Args:
        version_id (str): One of "A", "B", "C".
        case_id (str): Case identifier.
        attempt (int): 1-based attempt number.

    Returns:
        Optional[str]: The timeout message when this run should stall.
    """
    if (case_id, attempt) in INCIDENTAL_TIMEOUTS.get(version_id, set()):
        index = (attempt + len(case_id)) % len(TIMEOUT_MESSAGES)
        return TIMEOUT_MESSAGES[index]
    return None


def flaky_case_summary() -> Dict[str, object]:
    """Describe the injected flakiness for the demo script.

    Returns:
        Dict[str, object]: The flaky case, the attempts it fails, and how many
            incidental stalls each version carries.
    """
    flaky_attempts = sorted(a for c, a in INCIDENTAL_TIMEOUTS["A"] if c == FLAKY_CASE)
    incidental = {
        version: len(pairs) - (len(flaky_attempts) if version == "A" else 0)
        for version, pairs in INCIDENTAL_TIMEOUTS.items()
    }
    return {
        "caseId": FLAKY_CASE,
        "failingAttempts": flaky_attempts,
        "description": (
            f"{FLAKY_CASE} stalls on attempt {flaky_attempts[0]} and passes on the others, "
            "a genuine intermittent failure within a single version."
        ),
        "incidentalTimeouts": incidental,
    }


def describe_faults() -> List[Dict[str, object]]:
    """List every injected stall, for the demo script and for transparency.

    Returns:
        List[Dict[str, object]]: One dict per injected timeout.
    """
    described: List[Dict[str, object]] = []
    for version, pairs in sorted(INCIDENTAL_TIMEOUTS.items()):
        for case_id, attempt in sorted(pairs):
            described.append(
                {
                    "versionId": version,
                    "caseId": case_id,
                    "attempt": attempt,
                    "kind": "flaky" if (version == "A" and case_id == FLAKY_CASE) else "incidental",
                }
            )
    return described