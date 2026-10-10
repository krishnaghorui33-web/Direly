"""Evaluation runner, sample agent, and QA harness for OrderBot.

This package is the thing under test as much as the agent is. It contains:

    agent.py      the deterministic order-support agent (the thing being tested)
    manifests.py  the three version manifests A, B, C, and the real regression
    tools.py      tool schemas, the argument validator, and tool implementations
    retrieval.py  deterministic policy-document lookup
    cases.py      the 20 repeatable evaluation cases, shared by every version
    evaluator.py  executes cases x attempts x versions and emits run/event records
    harness.py    low-level execution helpers used by evaluator.py
    faults.py     simulated infrastructure only; never the version B regression
    selfcheck.py  database-free proof that the regression is genuine

Layering, so the QA story stays honest:

    agent.py  -- decides and executes, emits a trace
    evaluator.py -- runs the whole suite, builds the records
    submit.py -- ships finished records to the backend (no MongoDB)
    harness.py -- shared document construction

Nothing in this package imports pymongo or backend.app.db. The runner's job ends
at producing records; persisting them belongs to Shlok's FastAPI routes. The one
exception is scripts/seed_demo.py, which lives outside this package and adapts
these records to MongoDB for the analysis engine's tests.
"""

from runner.agent import AgentTrace, OrderBot, TraceEvent
from runner.cases import (
    ATTEMPTS_PER_CASE,
    CASES,
    Case,
    build_cases,
    case_ids,
    describe as describe_cases,
    get_order_case_ids,
)
from runner.evaluator import (
    EvaluationReport,
    evaluate_all_versions,
    evaluate_version,
    replay_version,
    summarize_report,
)
from runner.faults import describe_faults, flaky_case_summary, timeout_for
from runner.harness import ExecutionResult, run_case_attempt, summarize
from runner.manifests import (
    build_manifest_components,
    get_agent_param_name,
    get_order_param_name,
    get_tool_schema,
)
from runner.submit import (
    SubmissionError,
    build_replay_payload,
    build_runs_payload,
    submit_all_versions,
    submit_replay,
    submit_runs,
    write_payload,
)

__all__ = [
    "AgentTrace",
    "OrderBot",
    "TraceEvent",
    "ATTEMPTS_PER_CASE",
    "CASES",
    "Case",
    "build_cases",
    "case_ids",
    "describe_cases",
    "get_order_case_ids",
    "EvaluationReport",
    "evaluate_all_versions",
    "evaluate_version",
    "replay_version",
    "summarize_report",
    "describe_faults",
    "flaky_case_summary",
    "timeout_for",
    "ExecutionResult",
    "run_case_attempt",
    "summarize",
    "build_manifest_components",
    "get_agent_param_name",
    "get_order_param_name",
    "get_tool_schema",
    "SubmissionError",
    "build_replay_payload",
    "build_runs_payload",
    "submit_all_versions",
    "submit_replay",
    "submit_runs",
    "write_payload",
]