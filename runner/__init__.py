"""Test-case execution harness for OrderBot.

Runs every case against every attempt of a version by actually invoking the
agent, then converts each agent trace into the ``runs`` and ``events`` documents
that MongoDB stores. Nothing about the outcome is decided in advance; the run's
status comes from what the agent did.

Layout:
    cases.py   - the 20-case suite
    faults.py  - deterministic injection of environment flakiness
    harness.py - execution and document construction
"""

from runner.cases import CASES, Case, build_cases, case_ids, get_order_case_ids
from runner.faults import describe_faults, flaky_case_summary, timeout_for
from runner.harness import ExecutionResult, execute_version, run_case_attempt, summarize

__all__ = [
    "CASES",
    "Case",
    "build_cases",
    "case_ids",
    "get_order_case_ids",
    "describe_faults",
    "flaky_case_summary",
    "timeout_for",
    "ExecutionResult",
    "execute_version",
    "run_case_attempt",
    "summarize",
]