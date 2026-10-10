"""QA tests for the evaluation runner, replay, and regression detection.

These tests need no database. They exercise the agent, the case suite, and the
evaluator directly, which is deliberate: the runner's correctness must be
provable without infrastructure, so a green run means something even on a machine
that has never seen Atlas.

Every test here asserts on measured output. None of them restate an expected
number that the runner could produce by faking it, except where the point is
that a version is broken -- and even there the assertion checks the error's
content, not just its existence, so a generic crash cannot satisfy it.

Coverage maps to the acceptance list:

    test_baseline_version_passes_expected_cases       baseline passes
    test_broken_version_produces_schema_mismatch      real schema mismatch
    test_corrected_version_resolves_mismatch          fix verified
    test_identical_cases_across_comparisons           same cases used
    test_runner_errors_are_not_passed                 harness faults are failures
    test_event_ids_are_unique                         unique event ids
    test_duplicate_runs_do_not_inflate_metrics        no double counting
    test_backend_results_match_execution              records match reality
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.analysis.event_store import compute_event_id
from backend.app.analysis.patterns import classify_error, fingerprint_error
from runner import (
    CASES,
    OrderBot,
    build_manifest_components,
    evaluate_all_versions,
    evaluate_version,
    replay_version,
)
from runner.evaluator import _record_runner_error, _stats_for
from runner.faults import timeout_for


# --------------------------------------------------------------------------
# Baseline: version A must pass the cases that are supposed to pass
# --------------------------------------------------------------------------

def test_baseline_version_passes_expected_cases():
    """Version A passes every case except the deliberately flaky ones.

    A is the healthy release. It carries two injected gateway stalls so it is
    not artificially perfect, which is what makes flaky detection and
    noise-rejection demonstrable. Any *other* failure means the healthy version
    is broken and the whole comparison is meaningless.
    """
    result = evaluate_version("A")

    assert result.runner_errors == [], "baseline must not produce harness errors"
    assert result.stats["runs"] == 60
    # c03 stalls once then passes; c15 stalls once. Nothing else may fail.
    assert set(result.details["failedCases"]) == {"c03", "c15"}
    assert result.stats["passes"] == 58
    assert result.details["passRate"] == pytest.approx(58 / 60, abs=1e-4)


def test_baseline_failures_are_timeouts_not_validation():
    """A's failures are infrastructure, not argument errors.

    This is the assertion that keeps the noise honest. If A's two failures were
    validation errors, the diagnosis could not tell the injected flakiness apart
    from the version B regression.
    """
    result = evaluate_version("A")
    error_events = [e for e in result.events if e["type"] == "error"]

    assert error_events, "A is expected to record its two injected stalls"
    for event in error_events:
        assert classify_error(event)["pattern"] == "timeout", (
            f"baseline failure should be a timeout, got {event['payload']['message']!r}"
        )


def test_baseline_regression_magnitude_is_significant():
    """A versus B is a real regression, not noise the statistics cannot see.

    Uses the backend's own z-test rather than a local reimplementation, so this
    test fails if the gate the product relies on stops accepting the regression.
    """
    from backend.app.analysis.math_utils import calculate_z_test

    result = evaluate_version("B")
    verdict = calculate_z_test(
        runs_a=60, passes_a=58, runs_b=result.stats["runs"], passes_b=result.stats["passes"]
    )

    assert verdict["significant"] is True
    assert verdict["drop"] == pytest.approx(0.60, abs=1e-4)


# --------------------------------------------------------------------------
# Regression: version B must fail for a real, inspectable reason
# --------------------------------------------------------------------------

def test_broken_version_produces_schema_mismatch():
    """Version B fails with a genuine argument-name mismatch.

    Asserts the message content, not merely that something failed. A crash, a
    missing tool, or an empty retrieval would all satisfy a weaker assertion and
    none of them is the regression the product is built to find.
    """
    result = evaluate_version("B")

    assert result.runner_errors == []
    assert result.stats["failures"] > 0

    errors = [e for e in result.events if e["type"] == "error"]
    validation_errors = [
        e for e in errors if classify_error(e)["pattern"] == "invalid_tool_args"
    ]

    assert validation_errors, "B must produce argument-validation errors"

    messages = {e["payload"]["message"] for e in validation_errors}
    assert messages == {"unexpected argument 'order_id' for get_order"}, (
        f"unexpected B failure message(s): {messages}"
    )
    assert all(e["payload"]["tool"] == "get_order" for e in validation_errors)


def test_broken_version_does_not_fail_the_control_group():
    """No control-group case fails from the regression on version B.

    c13-c20 never touch get_order, so none of them may fail with an argument
    error. Two of them do fail on B -- c14 and c17 -- but from deliberately
    injected gateway stalls, which are simulated infrastructure rather than the
    regression. Asserting that no policy case fails at all would be wrong; the
    meaningful claim is that the *regression's signature* never appears outside
    the get_order path.
    """
    result = evaluate_version("B")
    policy_ids = {c.case_id for c in CASES if not c.exercises_get_order}

    validation_failures = {
        e["runId"].split("_")[-2]
        for e in result.events
        if e["type"] == "error" and classify_error(e)["pattern"] == "invalid_tool_args"
    }

    assert not (validation_failures & policy_ids), (
        f"regression leaked into the control group: {validation_failures & policy_ids}"
    )


def test_version_b_failures_share_one_fingerprint():
    """All of B's schema failures collapse to a single fingerprint.

    This is what makes fix verification possible. verify_fix compares the set of
    fingerprints covering the top 80% of failures before and after the fix; if
    one regression scattered across 36 fingerprints, the verdict would be
    meaningless.
    """
    result = evaluate_version("B")
    errors = [e for e in result.events if e["type"] == "error"]
    validation = [
        e for e in errors if classify_error(e)["pattern"] == "invalid_tool_args"
    ]

    fingerprints = {fingerprint_error(e) for e in validation}
    assert len(fingerprints) == 1, f"expected one fingerprint, got {fingerprints}"
    assert len(validation) == 36


def test_schema_and_code_disagree_only_on_version_b():
    """The regression is a divergence between two independent sources.

    The version B failure is only real if the schema requirement and the agent's
    code are two separate answers. If one function produced both, the agent
    would echo the schema and B would pass, so this test pins the divergence in
    place.
    """
    from runner.manifests import get_agent_param_name, get_order_param_name

    for version in ("A", "B", "C"):
        assert get_order_param_name(version) == get_agent_param_name(version) or version == "B", (
            f"{version} should not diverge"
        )

    assert get_order_param_name("B") != get_agent_param_name("B")
    assert get_order_param_name("A") == get_agent_param_name("A")
    assert get_order_param_name("C") == get_agent_param_name("C")


# --------------------------------------------------------------------------
# Fix: version C must resolve it, on the same cases
# --------------------------------------------------------------------------

def test_corrected_version_resolves_mismatch():
    """Version C passes everything the broken version failed.

    Asserted per case, not as an aggregate rate, so a fix that accidentally
    broke a passing case cannot hide inside a percentage.
    """
    broken = evaluate_version("B")
    fixed = evaluate_version("C")

    broken_failures = set(broken.details["failedCases"])
    fixed_failures = set(fixed.details["failedCases"])

    assert fixed.stats["failures"] == 0
    assert fixed.stats["passes"] == 60
    assert not (broken_failures & fixed_failures)
    assert fixed_failures <= {"c14", "c17"}  # injected stalls are absent on C


def test_fix_does_not_regress_the_baseline():
    """C is at least as healthy as A.

    Guard against a "fix" that trades a crash for a subtle degradation: C's
    pass rate must be within the tolerance verify_fix itself applies.
    """
    baseline = evaluate_version("A")
    fixed = evaluate_version("C")

    assert abs(fixed.details["passRate"] - baseline.details["passRate"]) <= 0.05


# --------------------------------------------------------------------------
# Comparability: the same cases, or the comparison means nothing
# --------------------------------------------------------------------------

def test_identical_cases_across_comparisons():
    """Every version is evaluated against the identical case list.

    The comparison in the product assumes the inputs match. If a version ran a
    different or shorter case list, the pass rates would not be comparable and
    the diagnosis would be an artefact of the runner rather than the agent.
    """
    reports = {v: evaluate_version(v) for v in ("A", "B", "C")}

    reference = {(r["caseId"], r["attempt"]) for r in reports["A"].runs}
    for version, result in reports.items():
        keys = {(r["caseId"], r["attempt"]) for r in result.runs}
        assert keys == reference, f"version {version} ran a different case set"
        assert len(result.runs) == len(CASES) * 3


def test_case_suite_covers_both_paths():
    """The suite exercises the broken tool and an unaffected control path.

    Without the control group there is nothing to compare against, and without
    get_order coverage there is no regression to detect.
    """
    assert len(CASES) == 20
    get_order = [c for c in CASES if c.exercises_get_order]
    control = [c for c in CASES if not c.exercises_get_order]

    assert len(get_order) == 12
    assert len(control) == 8
    assert any("refund_order" in c.expected_tools for c in get_order), (
        "refund cases must route through get_order"
    )


# --------------------------------------------------------------------------
# Runner faults must never read as success
# --------------------------------------------------------------------------

def test_runner_errors_are_not_passed(monkeypatch):
    """A harness exception becomes a recorded failure, never a pass.

    This is the test that would catch a swallowed exception inflating every
    pass rate in the product. The agent is patched to explode; the requirement
    is that the run is recorded as fail, carries a runner_error check, and is
    still counted in the totals rather than dropped.
    """
    from runner import evaluator

    def explode(*args, **kwargs):
        raise RuntimeError("synthetic harness defect")

    monkeypatch.setattr(evaluator, "run_case_attempt", explode)

    result = evaluate_version("A")

    assert result.stats["runs"] == 60, "the failed run must still be counted"
    assert result.stats["passes"] == 0
    assert result.stats["failures"] == 60
    assert len(result.runner_errors) == 60
    assert all(r["failedChecks"] == ["runner_error"] for r in result.runs)
    assert result.details["passRate"] == 0.0


def test_runner_error_produces_an_error_event():
    """A harness failure is visible in the event stream, not invisible.

    Silently recording the failure without an event would make it invisible to
    every downstream analysis, which is how a broken runner could hide inside an
    otherwise plausible evaluation.
    """
    from runner import evaluator

    def explode(*args, **kwargs):
        raise ValueError("synthetic")

    original = evaluator.run_case_attempt
    evaluator.run_case_attempt = explode
    try:
        result = evaluate_version("A", attempts=1, cases=CASES[:1])
    finally:
        evaluator.run_case_attempt = original

    errors = [e for e in result.events if e["type"] == "error"]
    assert len(errors) == 1
    assert errors[0]["payload"]["errorType"] == "RunnerError"
    assert "synthetic" in errors[0]["payload"]["message"]


def test_unknown_version_is_rejected():
    """An unknown version id raises rather than defaulting to something.

    Silently falling back to a default manifest would let a typo produce a
    plausible-looking evaluation of a version that does not exist.
    """
    with pytest.raises(ValueError, match="Unknown version"):
        evaluate_version("Z")


# --------------------------------------------------------------------------
# Event identity and idempotency
# --------------------------------------------------------------------------

def test_event_ids_are_unique():
    """Every event in a full evaluation has a distinct id.

    Ids are computed as sha1(runId:seq:type), so uniqueness follows from run and
    seq being unique. Verified rather than assumed, because a collision would
    cause MongoDB to silently drop evidence via the duplicate-key index.
    """
    report = evaluate_all_versions()

    computed = [
        compute_event_id(e["runId"], e["seq"], e["type"]) for e in report.events
    ]
    assert len(computed) == len(set(computed)), "duplicate event ids in the report"
    assert len(report.events) == 1128


def test_event_ids_are_deterministic_across_runs():
    """The same evaluation produces the same event ids.

    This is what makes re-ingesting a batch idempotent instead of duplicating
    evidence, and what lets a replay be compared against stored data.
    """
    first = evaluate_all_versions()
    second = evaluate_all_versions()

    ids_first = [compute_event_id(e["runId"], e["seq"], e["type"]) for e in first.events]
    ids_second = [compute_event_id(e["runId"], e["seq"], e["type"]) for e in second.events]

    assert ids_first == ids_second


def test_duplicate_events_do_not_inflate_metrics():
    """Submitting the same batch twice must not double the run count.

    Simulates what insert_events_safe does with the duplicate-key index: the
    second submission is counted as duplicates and stored nothing. Asserting
    this without a database is possible because the dedup key is deterministic,
    so it can be modelled directly.
    """
    report = evaluate_all_versions()

    # The seen-set persists across submissions, which is the whole point: the
    # duplicate-key index lives in the database, not in the request, so the
    # second POST of an identical batch finds every key already present.
    seen = set()

    def ingest(batch):
        """Insert a batch by unique key, counting duplicates.

        Args:
            batch (List[Dict[str, Any]]): Event documents.

        Returns:
            Tuple[int, int]: (inserted, duplicates).
        """
        inserted = duplicates = 0
        for event in batch:
            key = compute_event_id(event["runId"], event["seq"], event["type"])
            if key in seen:
                duplicates += 1
            else:
                seen.add(key)
                inserted += 1
        return inserted, duplicates

    first = ingest(report.events)
    second = ingest(report.events)

    assert first == (len(report.events), 0)
    assert second == (0, len(report.events))
    assert len(seen) == len(report.events), "stored event count must not grow on re-submit"

    run_ids = [r["_id"] for r in report.runs]
    assert len(set(run_ids)) == len(run_ids), "run ids must be unique too"


def test_pass_rate_is_counted_not_assumed():
    """The reported pass rate is derived from the documents, not from a constant.

    Feeds _stats_for a hand-built set with a known ratio and checks the count.
    If the rate were read from somewhere else, a wrong document set would still
    report the expected number.
    """
    runs = [
        {"caseId": "c01", "status": "pass", "latencyMs": 10},
        {"caseId": "c02", "status": "pass", "latencyMs": 20},
        {"caseId": "c03", "status": "fail", "latencyMs": 30},
        {"caseId": "c04", "status": "fail", "latencyMs": 40},
    ]
    stats = _stats_for("X", runs)

    assert stats["passes"] == 2
    assert stats["failures"] == 2
    assert stats["passRate"] == 0.5
    assert stats["avgLatencyMs"] == 25
    assert stats["failedCases"] == ["c03", "c04"]


# --------------------------------------------------------------------------
# Replay
# --------------------------------------------------------------------------

def test_replay_reproduces_the_same_outcome():
    """Replaying a version produces identical results, so drift is detectable.

    Replay is a feature of the product: re-running the same cases must be able to
    confirm or refute a stored result. That only works if execution is
    deterministic, so this asserts the stronger property -- a replay of an
    unchanged version reports zero changed outcomes.
    """
    baseline = evaluate_all_versions()
    outcome = replay_version("B", baseline=baseline)

    assert outcome["deterministic"] is True
    assert outcome["changed"] == []
    assert outcome["regressed"] == []
    assert outcome["recovered"] == []
    assert outcome["runnerErrors"] == []


def test_replay_detects_a_real_change():
    """When the agent genuinely changes, replay reports which runs flipped.

    Compares version B against stored version A runs to exercise the diff path
    without mutating the agent, so the comparison logic is tested rather than
    assumed.
    """
    baseline = evaluate_all_versions()

    # A report whose A-version runs have been swapped for B-version outcomes, so
    # re-running B genuinely differs from what was "stored".
    tampered = evaluate_version("A")
    broken = evaluate_version("B")
    for stored, fresh in zip(tampered.runs, broken.runs):
        stored["status"] = fresh["status"]

    outcome = replay_version("A", baseline=_report_with(tampered.runs))

    assert outcome["deterministic"] is False
    assert outcome["changed"], "a genuine change must be reported"
    assert all("/" in key for key in outcome["changed"])


def _report_with(runs):
    """Wrap run documents in a minimal baseline report.

    Args:
        runs (List[Dict[str, Any]]): Run documents.

    Returns:
        EvaluationReport: A report carrying only those runs.
    """
    from runner.evaluator import EvaluationReport

    return EvaluationReport(project_id="orderbot", runs=runs)


# --------------------------------------------------------------------------
# Backend agreement
# --------------------------------------------------------------------------

def test_backend_results_match_execution():
    """The stored records and the measured results agree.

    The acceptance requirement is that what the backend reports matches what
    actually executed. These documents are the input the backend stores, so the
    check is that their shape and contents satisfy the backend's validator, and
    that the counts in the documents match the counted statistics.
    """
    from backend.app.db import SCHEMA_RUNS, SCHEMA_EVENTS

    report = evaluate_all_versions()

    required_runs = SCHEMA_RUNS["$jsonSchema"]["required"]
    required_events = SCHEMA_EVENTS["$jsonSchema"]["required"]

    for run in report.runs:
        for field in required_runs:
            assert field in run, f"run document missing required field {field}"
        assert isinstance(run["latencyMs"], int), "latencyMs must be an int, not a float"
        assert run["status"] in {"pass", "fail"}
        assert run["attempt"] >= 1

    for event in report.events:
        for field in required_events:
            assert field in event, f"event document missing required field {field}"

    for version, stats in report.per_version.items():
        actual_passes = sum(1 for r in report.runs if r["versionId"] == version and r["status"] == "pass")
        assert stats["passes"] == actual_passes
        assert stats["runs"] == sum(1 for r in report.runs if r["versionId"] == version)


def test_event_payload_carries_the_error_detail_the_product_needs():
    """Error payloads carry what classify_error and the dashboard need.

    The fingerprint is derived from the message and tool, so if either were
    missing the evidence would still be stored but unclassifiable, which is a
    failure that would only show up as an empty dashboard.
    """
    result = evaluate_version("B")
    errors = [e for e in result.events if e["type"] == "error"]

    assert errors
    for event in errors:
        payload = event["payload"]
        assert payload.get("message"), "an error event needs a message"
        assert "tool" in payload
        classification = classify_error(event)
        assert classification["pattern"] is not None, (
            f"unclassified error: {payload['message']!r}"
        )
        assert len(fingerprint_error(event)) == 16


def test_agent_emits_full_lifecycle():
    """A successful run produces the event sequence the dashboard renders.

    prompt and retrieval are in the validator's event-type enum but were never
    emitted by the old fabricated seeder, so this pins that the real agent
    produces them.
    """
    result = evaluate_version("C", attempts=1, cases=CASES[:1])
    types = [e["type"] for e in result.events]

    assert types[0] == "user_input"
    assert "prompt" in types
    assert "retrieval" in types
    assert "tool_call" in types
    assert "tool_result" in types
    assert types[-1] == "output"


def test_timestamps_are_strictly_increasing():
    """Events within a run are ordered by distinct timestamps.

    find_suspects sorts evidence refs by ts and truncates, so tied timestamps
    would make the evidence selection depend on insertion order.
    """
    result = evaluate_version("B", attempts=1, cases=CASES[:1])
    timestamps = [e["ts"] for e in result.events]

    assert timestamps == sorted(timestamps)
    assert len(set(timestamps)) == len(timestamps)


def test_all_versions_produce_the_documented_dataset():
    """A, B, and C land on the pass rates the demo narrates.

    This is the one place that pins absolute numbers, so it is also the place
    that will fail loudly if a future change silently moves the story. The demo
    script quotes these figures, so they are treated as a contract.
    """
    report = evaluate_all_versions()

    assert report.per_version["A"]["passes"] == 58
    assert report.per_version["B"]["passes"] == 22
    assert report.per_version["C"]["passes"] == 60
    assert report.runner_errors == []
    assert report.run_count == 180
    assert report.event_count == 1128