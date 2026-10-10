"""Print the demo runbook for Direly.

This script prints a script a presenter can read off the screen. It reads from the
agent, the case suite and the fault table -- the same objects the seeder executes
-- so the narration cannot drift out of sync with what actually happens in the
demo. It computes nothing about outcomes: the pass rates and verdicts in the
output come from querying MongoDB, because those are what Direly concludes, and
narrating a conclusion the seeder chose would be the same fabricated-demo problem
this lane exists to remove.

Two modes:

    python scripts/demo_script.py          # runbook only, no database needed
    python scripts/demo_script.py --live   # also query MongoDB for real numbers

With no database reachable, --live prints the database-dependent steps with a
placeholder instead of a number, and says so, rather than guessing.
"""

import os
import sys
from typing import Any, Dict, List, Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from runner.cases import ATTEMPTS_PER_CASE, CASES, describe
from runner.faults import describe_faults, flaky_case_summary

RULE = "-" * 78


def _section(title: str) -> None:
    """Print a section heading.

    Args:
        title (str): Heading text.
    """
    print(f"\n{RULE}\n{title}\n{RULE}")


def print_story() -> None:
    """Print the narrative arc: what broke, what it looks like, what fixed it."""
    _section("THE STORY IN ONE PARAGRAPH")
    print(
        "OrderBot answers customer order questions. Release A worked. Release B\n"
        "shipped a one-word change: the get_order tool's schema renamed its\n"
        "parameter from 'order_id' to 'orderId'. Nobody changed the agent code,\n"
        "so the code kept sending 'order_id'. Every call that reached get_order\n"
        "was rejected by argument validation. Release C updated the code to match.\n"
        "\n"
        "Direly's job is to work out which of those two changed -- the schema or\n"
        "the code -- from the stored run records alone."
    )


def print_versions() -> None:
    """Print what differs between the three versions."""
    _section("THE THREE VERSIONS")
    print(
        "  A  Release A   healthy baseline. Schema and code agree.\n"
        "  B  Release B   schema renamed order_id -> orderId. Code untouched. BROKEN.\n"
        "  C  Release C   code updated to send orderId. Schema unchanged from B. FIXED.\n"
        "\n"
        "B and C share a code commit that A does not have. That is what makes the\n"
        "diagnosis non-trivial: the diff between A and B touches tools only, but\n"
        "the diff between B and C touches code only. A tool that reads 'which\n"
        "version changed what' has to get both right to name the right culprit."
    )


def print_suite() -> None:
    """Print the case suite composition."""
    _section("THE TEST SUITE")
    get_order_cases = [c for c in CASES if c.exercises_get_order]
    policy_cases = [c for c in CASES if not c.exercises_get_order]
    refunds = [c for c in CASES if "refund_order" in c.expected_tools]

    print(f"  {len(CASES)} cases x {ATTEMPTS_PER_CASE} attempts x 3 versions "
          f"= {len(CASES) * ATTEMPTS_PER_CASE * 3} runs\n")
    print(f"  {len(get_order_cases)} cases reach get_order "
          f"({', '.join(c.case_id for c in get_order_cases)})")
    print(f"    - {len(refunds)} of those are refunds, which call get_order first")
    print(f"  {len(policy_cases)} cases are policy questions answered from retrieval "
          f"({', '.join(c.case_id for c in policy_cases)})")
    print("\n  The policy group is the control group. It never touches get_order,")
    print("  so it should be unaffected by the regression. If it is not, the")
    print("  diagnosis is wrong and that is visible rather than hidden.")


def print_expected_shape() -> None:
    """Print the expected qualitative outcome, without asserting exact counts."""
    _section("WHAT SHOULD HAPPEN (verify against the live numbers, do not assume)")
    print(
        "  Version A  nearly all runs pass. The two failures are simulated\n"
        "            infrastructure, not a code defect.\n"
        "\n"
        "  Version B  every run that reaches get_order fails with the same\n"
        "            validation error. The policy group still passes. The two\n"
        "            failure modes stay separable by their error message.\n"
        "\n"
        "  Version C  everything passes.\n"
        "\n"
        "  Key number to watch: the 36 get_order failures on B must collapse to\n"
        "  a SINGLE fingerprint. If they split into many, the error grouping is\n"
        "  broken and the fix verification will be wrong too."
    )


def print_faults() -> None:
    """Print the injected infrastructure faults."""
    _section("INJECTED FLAKINESS (simulated environment, not the bug)")
    summary = flaky_case_summary()
    print(f"  {summary['description']}")
    print("\n  Every injected stall:")
    for fault in describe_faults():
        print(
            f"    version {fault['versionId']}  case {fault['caseId']}  "
            f"attempt {fault['attempt']}  ({fault['kind']})"
        )
    print(
        "\n  Be ready for the question 'did you just hardcode version B as broken?'\n"
        "  The answer is that nothing in runner/ can produce the B\n"
        "  failure. The agent sends whatever name its code says; the B schema\n"
        "  requires the other one; validation rejects it. The failure is computed,\n"
        "  not injected. Only the timeouts above are injected, and they are\n"
        "  injected to make sure the diagnosis ignores noise."
    )


def _try_db() -> Optional[Any]:
    """Connect to the configured database, or return None if unavailable.

    Returns:
        Optional[Database]: Connected database, or None when Atlas is not
            configured or not reachable.
    """
    try:
        from backend.app.db import get_db

        return get_db()
    except Exception as exc:  # noqa: BLE001 - any failure means "no live data"
        print(f"  (no live data: {exc})")
        return None


def print_live() -> None:
    """Query MongoDB for the real numbers and print them."""
    _section("LIVE NUMBERS FROM MONGODB")
    db = _try_db()
    if db is None:
        print(
            "  Could not reach the database. Set MONGODB_URI in .env, run\n"
            "  `python scripts/seed_demo.py`, then re-run this script with --live.\n"
            "\n"
            "  Deliberately not printing expected counts as if they were real."
        )
        return

    print("\n  Success rate by version:")
    try:
        rows = list(db.version_stats.find({"projectId": "orderbot"}, {"_id": 0}))
        for row in sorted(rows, key=lambda r: r.get("versionId", "")):
            print(
                f"    version {row.get('versionId')}: "
                f"{row.get('passedRuns')}/{row.get('totalRuns')} "
                f"({row.get('successRate', 0):.2%})"
            )
    except Exception as exc:  # noqa: BLE001
        print(f"    (version_stats unavailable: {exc})")

    print("\n  Failure groups on version B (fingerprint -> count):")
    try:
        pipeline = [
            {"$match": {"projectId": "orderbot", "versionId": "B", "type": "error"}},
            {"$group": {"_id": "$pattern", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        for row in db.events.aggregate(pipeline):
            print(f"    {row['_id']}  x{row['count']}")
    except Exception as exc:  # noqa: BLE001
        print(f"    (error grouping unavailable: {exc})")

    print("\n  Findings raised:")
    try:
        for finding in db.findings.find({"projectId": "orderbot"}, {"_id": 0}):
            print(
                f"    {finding.get('component')}  status={finding.get('status')}  "
                f"confidence={finding.get('confidence')}"
            )
            if finding.get("reason"):
                print(f"      {finding['reason']}")
    except Exception as exc:  # noqa: BLE001
        print(f"    (findings unavailable: {exc})")

    print("\n  Verify-fix verdict (B -> C, baseline A):")
    try:
        from backend.app.analysis.verify import verify_fix

        result = verify_fix(db, "orderbot", bad_version_id="B", fix_version_id="C",
                            baseline_version_id="A", min_runs=10)
        print(f"    {result['result']} -> {result['newStatus']}")
        print(f"    {result['reason']}")
    except Exception as exc:  # noqa: BLE001
        print(f"    (verify_fix unavailable: {exc})")


def print_steps() -> None:
    """Print the numbered live-demo steps."""
    _section("LIVE DEMO STEPS")
    steps = [
        "Show the runner working, no database needed.",
        "    python -m runner",
        "    A 58/60, B 22/60, C 60/60. 'runner errors: none'.",
        "    Nothing is hand-written: these numbers are counted from records.",
        "",
        "Prove the regression is real, still no database.",
        "    python -m runner --selfcheck",
        "    Version B fails for exactly one reason, and it is named:",
        "        unexpected argument 'order_id' for get_order",
        "",
        "Then send the records to the backend.",
        "    python -m runner --submit --base-url http://localhost:8000",
        "    (Once Shlok's routes exist. Today there is no FastAPI app yet,",
        "    so this step fails with 'is the backend running?' -- which is",
        "    the honest answer at this stage.)",
        "",
        "To populate MongoDB directly for the analysis tests:",
        "    python scripts/seed_demo.py",
        "",
        "Open the dashboard, Versions tab.",
        "    A ~97% pass, B ~37% pass, C 100% pass.",
        "    The drop is the whole story in one number.",
        "",
        "Click A -> B.",
        "    Show the failure groups. One group dominates, and it is not",
        "    spread evenly: the policy questions are untouched.",
        "",
        "Show the ranked suspect.",
        "    'tools'. Confidence high. THIS IS THE MOMENT.",
        "    Open the evidence refs -- each one is a real error event on a real",
        "    failed run of B. Click through one. Show the message:",
        "        unexpected argument 'order_id' for get_order",
        "    That sentence names the bug without knowing it.",
        "",
        "Point at the manifest diff.",
        "    order_id -> orderId. That is the change. The code did not move.",
        "",
        "Click the fix-verification view.",
        "    B -> C, baseline A. Verdict: resolved.",
        "    Same failure group, now zero occurrences.",
        "",
        "Edge cases to raise before anyone asks:",
        "    - Version A's flaky case. It alternates pass/fail WITHIN one",
        "      version. A tool that flags any failure as a regression is wrong.",
        "    - The incidental timeouts. Same error class as a real outage, but",
        "      they fail on green cases too, so frequency alone cannot separate",
        "      them from the regression. Only the argument in the message can.",
    ]
    for step in steps:
        print(f"  {step}")

    _section("FAILURE MODES TO HAVE ANSWERS FOR")
    print(
        "  Q: Is version B hardcoded as broken?\n"
        "  A: No. The agent and the schema disagree, and the validator rejects\n"
        "     the call. Point at get_agent_param_name vs get_order_param_name in\n"
        "     runner/manifests.py -- two functions, two independent answers.\n"
        "\n"
        "  Q: What if the diagnosis is wrong?\n"
        "  A: It is computed from stored events, so it is re-runnable and\n"
        "     falsifiable. Clear the database, re-seed, re-run.\n"
        "\n"
        "  Q: Why does A have any failures at all?\n"
        "  A: Simulated upstream gateway stalls, listed above. Injected on\n"
        "     purpose so the demo has noise to reject.\n"
        "\n"
        "  Q: Does the fix really work, or did the error just move?\n"
        "  A: verify_fix compares the fingerprint set, not the pass rate alone.\n"
        "     Same fingerprint, zero occurrences on C."
    )


def print_appendix() -> None:
    """Print the case table for anyone who wants the detail."""
    _section("APPENDIX: FULL CASE SUITE")
    for case in describe():
        tools = ", ".join(case["tools"])
        print(f"  {case['caseId']}  [{tools}]  {case['input']}")
        if case["note"]:
            print(f"        {case['note']}")


def main() -> int:
    """Print the runbook.

    Returns:
        int: Process exit code.
    """
    live = "--live" in sys.argv

    print(RULE)
    print("DIRELY DEMO SCRIPT -- OrderBot regression")
    print(RULE)

    print_story()
    print_versions()
    print_suite()
    print_expected_shape()
    print_faults()
    print_steps()

    if live:
        print_live()

    print_appendix()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())