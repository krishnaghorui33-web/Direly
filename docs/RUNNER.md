# Runner, Replay, and QA — Krishna's lane

The sample agent, the evaluation runner, regression replay, and the QA suite.

Everything here runs **without a database**. That is deliberate: the runner's
correctness must be provable on any machine, so a green test run means something
even before Atlas exists.

## Layout

| File | Role |
| --- | --- |
| `runner/agent.py` | The order-support agent. Decides, calls tools, emits a trace. |
| `runner/manifests.py` | The three version manifests, and the regression itself. |
| `runner/tools.py` | Tool schemas, the argument validator, tool implementations. |
| `runner/retrieval.py` | Deterministic policy lookup. |
| `runner/cases.py` | The 20 evaluation cases, shared by every version. |
| `runner/evaluator.py` | Executes cases × attempts × versions, emits run/event records. |
| `runner/harness.py` | Single-run execution and document construction. |
| `runner/faults.py` | Simulated infrastructure only. Never the regression. |
| `runner/replay` (in `evaluator.py`) | Re-executes and diffs against a stored baseline. |
| `runner/submit.py` | Ships records to the backend over HTTP. No MongoDB. |
| `runner/selfcheck.py` | Database-free proof that the regression is genuine. |
| `tests/test_runner.py` | 25 QA tests. No database. |

## Commands

```bash
# Evaluate every version (A, B, C). 180 runs, 1128 events.
python -m runner

# One version at a time.
python -m runner --version A
python -m runner --version B
python -m runner --version C

# Prove the regression is real. No database, exits non-zero on failure.
python -m runner --selfcheck

# Send records to Shlok's backend.
python -m runner --submit --base-url http://localhost:8000

# Write the payload to a file instead, for debugging the ingest route.
python -m runner --submit --out payload.json

# Populate MongoDB directly, for the analysis engine's tests.
python scripts/seed_demo.py

# Print the demo runbook.
python scripts/demo_script.py
python scripts/demo_script.py --live   # adds real numbers from MongoDB

# Tests.
python -m pytest tests/test_runner.py -v   # mine, no database
python -m pytest -v                        # everything; DB tests skip without Atlas
```

## The regression

Version B's failure is **computed, not injected**. Two independent functions in
[runner/manifests.py](../runner/manifests.py) answer different questions:

```python
get_order_param_name("B")   -> "orderId"   # what the schema requires
get_agent_param_name("B")   -> "order_id"  # what the agent code sends
```

They agree on A and C and disagree only on B, so the call fails real argument
validation in [runner/tools.py](../runner/tools.py):

```
unexpected argument 'order_id' for get_order
```

No rule anywhere can produce that failure by fiat. Deleting the divergence makes
B pass, and the tests pin that it exists.

`runner/faults.py` injects simulated infrastructure only — four gateway stalls,
including one case that alternates pass/fail *within* version A so the baseline
is not artificially perfect.

## Results

| Version | Passes | Rate | Failures |
| --- | --- | --- | --- |
| A | 58/60 | 96.67% | c03, c15 (injected stalls) |
| B | 22/60 | 36.67% | c01–c12 + c14, c17 |
| C | 60/60 | 100% | none |

B's 36 schema failures collapse to a single fingerprint. That collapse is what
makes fix verification work: `verify_fix` compares the fingerprint set, so a
regression scattered across 36 fingerprints would break the verdict.

## Demo procedure

1. `python -m runner --selfcheck` — the regression is real, no infrastructure.
2. `python -m runner` — 180 runs, measured pass rates, `runner errors: none`.
3. `python -m runner --submit` — records leave the runner here.
4. `python scripts/seed_demo.py` — populates MongoDB for the dashboard.
5. `find_suspects(A, B)` → `tools`, high confidence, real evidence event IDs.
6. `verify_fix(B, C, baseline=A)` → `resolved`.

Full narration with anticipated questions: `python scripts/demo_script.py`.

## Test coverage against the acceptance list

| Requirement | Test |
| --- | --- |
| Baseline passes expected cases | `test_baseline_version_passes_expected_cases` |
| Baseline failures are noise, not the bug | `test_baseline_failures_are_timeouts_not_validation` |
| Broken version produces a real schema mismatch | `test_broken_version_produces_schema_mismatch` |
| Regression signature stays in the broken path | `test_broken_version_does_not_fail_the_control_group` |
| Failures group into one fingerprint | `test_version_b_failures_share_one_fingerprint` |
| Regression is a two-source divergence | `test_schema_and_code_disagree_only_on_version_b` |
| Regression is statistically significant | `test_baseline_regression_magnitude_is_significant` |
| Corrected version resolves the mismatch | `test_corrected_version_resolves_mismatch` |
| Fix does not regress the baseline | `test_fix_does_not_regress_the_baseline` |
| Same cases used in each comparison | `test_identical_cases_across_comparisons` |
| Suite covers both paths | `test_case_suite_covers_both_paths` |
| Runner errors are not counted as passes | `test_runner_errors_are_not_passed` |
| Runner errors are visible in events | `test_runner_error_produces_an_error_event` |
| Unknown version rejected | `test_unknown_version_is_rejected` |
| Event IDs unique | `test_event_ids_are_unique` |
| Event IDs deterministic across runs | `test_event_ids_are_deterministic_across_runs` |
| Duplicates do not inflate metrics | `test_duplicate_events_do_not_inflate_metrics` |
| Pass rate counted, not assumed | `test_pass_rate_is_counted_not_assumed` |
| Replay reproduces the same outcome | `test_replay_reproduces_the_same_outcome` |
| Replay detects a real change | `test_replay_detects_a_real_change` |
| Backend results match execution | `test_backend_results_match_execution` |
| Error payloads are classifiable | `test_event_payload_carries_the_error_detail_the_product_needs` |
| Full lifecycle emitted | `test_agent_emits_full_lifecycle` |
| Timestamps strictly increasing | `test_timestamps_are_strictly_increasing` |
| Dataset matches the narrated story | `test_all_versions_produce_the_documented_dataset` |

## Two guarantees worth stating explicitly

**A runner error is never a pass.** If the harness raises, the run is recorded as
`fail` with `failedChecks: ["runner_error"]` and an explanatory error event. It is
never dropped and never counted as success. The runs validator only permits
`pass` or `fail`, so there is no third option — and a swallowed exception would
inflate every pass rate in the product.

**`submit.py` has no MongoDB fallback.** When the backend is unreachable it
raises `SubmissionError` and exits non-zero. A silent fallback would make the
data path ambiguous exactly when it matters: during a demo, when something has
gone wrong and nobody can say which path the data took.

## Open items for the team

1. **`POST /api/runs` and `POST /api/replay` do not exist yet.** There is no
   FastAPI app in the repo — only `backend/app/analysis/*` and `db.py`. The
   payload shape `runner/submit.py` sends is documented in that module's
   docstring and needs Shlok's confirmation. The field names deliberately match
   what the runs and events validators already require, because those are the
   fields `insert_events_safe` needs to work. If his route names differ, only
   the two `build_*_payload` functions change.

2. **`seed_demo.py` still connects to MongoDB directly.** The brief lists it as a
   deliverable and four teammates' test files call `seed_demo(db)` at 20 sites,
   so it is kept as a thin adapter. The runner package itself imports no MongoDB
   code. If the team decides to move seeding behind the API, that is a change to
   `scripts/seed_demo.py` only — no runner code needs to change.

3. **Frontend/backend identifier mismatch.** The dashboard uses
   `order_support_agent` / `v1.4.0`; the analysis engine and tests use `orderbot`
   / `A`,`B`,`C`. Shlok and Vishwatej need to reconcile this before the dashboard
   can render real results.