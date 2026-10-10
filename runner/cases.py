"""The OrderBot test-case suite.

Twenty cases, c01 through c20:

    c01-c12  exercise get_order. Most do so directly by asking about an order;
             a few go through refund_order, which calls get_order internally,
             so a get_order regression breaks them too.
    c13-c20  are policy questions answered from retrieval via search_policy.
             These are unaffected by a tool-schema change, which is exactly why
             they are useful: they are the control group that shows the
             regression is confined to the get_order path rather than the whole
             agent failing.

The split matters for the diagnosis. On version B the c01-c12 cases fail
through a real validation error while c13-c20 keep passing, so Direly sees a
partial, tool-shaped failure rather than a uniform outage.
"""

from dataclasses import dataclass
from typing import Any, Dict, List

# How many times each case is attempted. Repeated attempts are what make a case
# eligible for flaky detection, and they are pinned at 3 because
# tests/test_verify.py asserts that a version has fewer than 100 runs.
ATTEMPTS_PER_CASE = 3


@dataclass(frozen=True)
class Case:
    """One test case.

    Attributes:
        case_id (str): Identifier, e.g. "c01".
        user_input (str): The question handed to the agent.
        expected_tools (tuple): Tools the case is expected to call.
        exercises_get_order (bool): Whether the case reaches get_order, either
            directly or through refund_order.
        note (str): Short human-readable purpose, for the demo script.
    """

    case_id: str
    user_input: str
    expected_tools: tuple
    exercises_get_order: bool
    note: str


def build_cases() -> List[Case]:
    """Construct the full 20-case suite.

    Returns:
        List[Case]: Cases c01 through c20 in order.
    """
    cases: List[Case] = []

    # c01-c08: direct order lookups through get_order.
    for i in range(1, 9):
        cases.append(
            Case(
                case_id=f"c{i:02d}",
                user_input=f"Can you check the status of order ord_c{i:02d}?",
                expected_tools=("get_order",),
                exercises_get_order=True,
                note="Direct order lookup",
            )
        )

    # c09-c12: refund requests, which route through refund_order -> get_order.
    for i in range(9, 13):
        cases.append(
            Case(
                case_id=f"c{i:02d}",
                user_input=f"I need a refund for order ord_c{i:02d}, it arrived damaged.",
                expected_tools=("refund_order", "get_order"),
                exercises_get_order=True,
                note="Refund path, calls get_order internally",
            )
        )

    # c13-c20: policy questions answered from retrieval. Control group.
    policy_questions = [
        "What is your standard refund window?",
        "Is return shipping free for damaged items?",
        "What are the exchange requirements?",
        "How do you define a shipped order status?",
        "What happens after a failed delivery attempt?",
        "Can I still change my address after ordering?",
        "How long do exchanges take to process?",
        "What does your policy say about returns?",
    ]
    for offset, question in enumerate(policy_questions):
        index = 13 + offset
        cases.append(
            Case(
                case_id=f"c{index:02d}",
                user_input=question,
                expected_tools=("search_policy",),
                exercises_get_order=False,
                note="Policy retrieval, independent of tool schemas",
            )
        )

    return cases


CASES: List[Case] = build_cases()


def case_ids() -> List[str]:
    """Return the suite's case identifiers in order.

    Returns:
        List[str]: e.g. ["c01", ..., "c20"].
    """
    return [c.case_id for c in CASES]


def get_order_case_ids() -> List[str]:
    """Return the case ids that reach get_order, directly or indirectly.

    Returns:
        List[str]: Case ids in order.
    """
    return [c.case_id for c in CASES if c.exercises_get_order]


def describe() -> List[Dict[str, Any]]:
    """Describe the suite for the demo script.

    Returns:
        List[Dict[str, Any]]: One summary dict per case.
    """
    return [
        {
            "caseId": c.case_id,
            "input": c.user_input,
            "tools": list(c.expected_tools),
            "exercisesGetOrder": c.exercises_get_order,
            "note": c.note,
        }
        for c in CASES
    ]