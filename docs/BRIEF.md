ROLE
You are a senior MongoDB and Python engineer working as a coding agent inside my project folder. I own the MongoDB layer and the diagnosis logic of a hackathon MVP that must be working in under 6 hours. Follow this brief exactly. Wherever the brief states a default, use it instead of asking me. Ask at most one question, and only if you are truly blocked.

1. PROJECT OVERVIEW
Name: DIRELY. Tagline: Detect the regression. Diagnose the likely cause. Verify the fix.
Problem: AI agents break after small changes to a prompt, tool schema, model setting, retrieval setup or code. Logs show that the agent failed, not which change caused it. Outputs are probabilistic, so flaky failures make developers blame the wrong change.
What DIRELY does: it stores the history of agent test runs in MongoDB, detects when the success rate drops between versions, groups recurring failures, finds which changed components may explain them, shows real supporting evidence, and verifies a fix by comparing replayed runs.
Core principles:
- The diagnosis is deterministic and computed from stored manifests, runs and events. Never hardcode the answer or expected values in the analysis code.
- DIRELY reports a LIKELY cause with evidence, never proof.
- If evidence is thin, it says so (uncertainty), instead of guessing.
- No LLM is used anywhere in my part.
Context: MongoDB Code for Change hackathon, team Code Nest, project name DIRELY.

2. TEAM OWNERSHIP (do not cross these lines)
- Me (team lead): MongoDB schema, indexes, validation, aggregation pipelines, error classification, failure fingerprints, diagnosis logic. THIS IS THE TASK.
- Shlok: the FastAPI app, all HTTP routes, the ingestion route, secret redaction. He imports and calls my functions. Do NOT write API routes or a separate backend.
- Vishwatej: the React dashboard, which reads the API.
- Krishna: the sample agent (OrderBot), the test runner and the data that creates runs and events.
Hard rules: do not build a separate backend, and do not change the shared schema in section 4. Any extra field you need must be optional, listed explicitly, and go inside payload where possible.

3. DATA FLOW
Runner (Krishna) sends runs and events to FastAPI (Shlok), which writes to MongoDB Atlas through my helper functions. FastAPI calls my analysis functions and returns JSON to the dashboard (Vishwatej).

4. SHARED DATA CONTRACT (authoritative; use these exact names)
Database name: direly. Python 3.11, pymongo 4.x, MongoDB Atlas M0 (do not use features that M0 does not support).

projects: _id (string projectId), name, createdAt, dependencyMap (optional object, for example {"get_order": ["refund_order", "order_tracking_workflow"]}).

versions: _id (string versionId, for example "A"), projectId, label, createdAt,
  components: { prompt: string, tools: [ {name, description, parameters: {type, properties: {...}, required: [...]}} ], model: {name, temperature, ...}, retrieval: {index, topK, ...}, code: {commit} },
  hashes: { prompt, tools, model, retrieval, code } where each is the sha1 of the canonical JSON (sorted keys, no spaces) of that component,
  manifestHash: sha1 of the canonical JSON of hashes.
Note: the word "manifest" in the team's earlier notes means components + hashes + manifestHash together.

runs: _id (string runId), projectId, versionId, caseId, suiteVersion, attempt (int, 1 or more), status ("pass" or "fail"), failedChecks (array of strings), latencyMs (int), startedAt (date).
  One run is one attempt of one test case. The same case can have several attempts on the same version.

events: eventId (string, unique), runId, projectId, versionId, seq (int), type, ts (date), payload (free-form object).
  type is one of: user_input, prompt, retrieval, tool_call, tool_result, error, output.
  eventId = sha1 hex of the string "<runId>:<seq>:<type>".
  For events with type "error", payload normally contains: errorType (optional hint), tool, message, args (optional).

findings: _id (string findingId), projectId, versionId (the candidate version), baselineVersionId, suspectedComponent, detail, failureFingerprint, evidenceRefs (array of real eventId values), matchingFailedRuns, totalFailedRuns, score, confidence, reason, status ("open", "verified_fixed", "still_failing", "inconclusive"), createdAt.

Indexes to create:
- versions: (projectId, createdAt)
- runs: (projectId, versionId, status); (versionId, caseId, attempt)
- events: UNIQUE (eventId); (runId, seq); (projectId, versionId, type); (versionId, payload.fingerprint)
- findings: (projectId, versionId, createdAt); UNIQUE (projectId, versionId, baselineVersionId, suspectedComponent, failureFingerprint)
Validation: use $jsonSchema validators with validationLevel "strict" and validationAction "error" on events, runs, versions and findings.
- events required: eventId, runId, projectId, versionId, seq, type, ts. type must be in the list above. payload is a free-form object.
- runs required: projectId, versionId, caseId, attempt, status (enum), latencyMs, startedAt.
- versions required: projectId, components, hashes, manifestHash.
- findings required: projectId, versionId, baselineVersionId, suspectedComponent, evidenceRefs, reason, status, createdAt.
The setup function must be safe to run twice (create or collMod, create indexes idempotently).

5. THE 12 FEATURES AND WHERE EACH LIVES
1 Version comparison: mine (compare_versions, pass rates). 2 Failure pattern detection: mine (classification, fingerprints, grouping). 3 Evidence-based culprit finder: mine (find_suspects). 4 Flaky failure detection: mine, secondary priority, only with repeated comparable runs. 5 Blast-radius analysis: mine, secondary priority, only from a real dependencyMap. 6 Regression replay: Krishna's runner creates the runs; I compare them. 7 Fix verification: mine (verify_fix). 8 Release verdict: mine, lowest priority. 9 MongoDB history and reliability: mine (schema, unique index, validation, duplicate protection). 10 Live dashboard: Vishwatej. 11 Sensitive-data redaction: Shlok. 12 Plain-English diagnosis: mine as a template only, lowest priority, no LLM.
Do the PRIORITY items first: 1, 2, 3, 7, 9. Then 4, 5 only if the core passes all tests. Never fake flaky detection or blast radius: if repeated runs or a dependencyMap do not exist, return a clear "not enough data" result.

6. DEFINITIONS (use exactly)
Baseline version: the known-good version. Candidate version: the version being investigated.
Pass rate of a version = passing runs / total runs of that version.
Failed-run evidence = events with type "error" that belong to runs with status "fail".

Error pattern taxonomy and classification (check in this order, case-insensitive, on payload.errorType, payload.message and the failed check names):
1. invalid_tool_args: message contains "missing required", "unexpected argument", "invalid argument", "validation", or "schema"; or errorType is invalid_tool_args.
2. tool_not_found: message contains "unknown tool", "no such tool", or "tool not found".
3. retrieval_empty: message contains "no documents", "empty retrieval", or "retrieval returned 0".
4. timeout: message contains "timeout" or "timed out".
5. wrong_tool: the failed check is tool_called, or message says the wrong tool was used.
6. other: anything else.

Pattern to component map: invalid_tool_args -> tools; tool_not_found -> tools; retrieval_empty -> retrieval; wrong_tool -> prompt; timeout -> model and code; other -> no component.

Fingerprint: the first 16 hex characters of sha1("<pattern>|<tool>|<normalized message>"). Normalize the message by lowercasing, replacing digits with <N>, replacing hex or UUID strings of 8 or more characters with <ID>, replacing quoted literal values with <VAL>, and collapsing whitespace. Do NOT remove identifier-like names such as argument names (orderId, order_id), because they are part of the evidence. The same underlying error must always produce the same fingerprint.

7. FUNCTIONS TO IMPLEMENT (exact names and signatures; db is a pymongo Database passed in)
insert_events_safe(db, events) -> {"inserted": int, "duplicates": int, "rejected": [{"index": int, "reason": str}]}
  Compute eventId if missing. For events with type "error", add payload.pattern and payload.fingerprint using classify_error and fingerprint_error. Use insert_many(ordered=False). A duplicate-key error (code 11000) counts as a duplicate, NOT a failure. A validation error (code 121) goes into rejected with a clear reason from the error details. Shlok will call this function from his ingestion route.

classify_error(event) -> {"pattern": str, "tool": str or None}
fingerprint_error(event) -> str

success_rate_by_version(db, project_id) -> list of {versionId, runs, passes, failures, passRate}, ordered by version createdAt (use an aggregation).
failure_counts_by_fingerprint(db, project_id, version_id=None) -> list of {versionId, fingerprint, pattern, tool, count} (use an aggregation on payload.fingerprint).

compare_versions(db, project_id, baseline_version_id, candidate_version_id) -> dict with:
  changedComponents (list among prompt, tools, model, retrieval, code, decided by comparing hashes), unchangedComponents,
  toolDiff: {addedTools, removedTools, changedTools: {toolName: {addedParams, removedParams, possibleRename: [oldName, newName] when exactly one parameter was removed and one added, requiredChanged}}},
  and for prompt, model, retrieval, code: the old and new values (for the prompt, a short unified diff).
  Raise ValueError if a version is missing or belongs to a different project.

find_suspects(db, project_id, baseline_version_id, candidate_version_id, min_runs=10, save=True) -> dict
  Steps:
  a) Compute both pass rates. If either version has fewer than min_runs runs, return status "insufficient_evidence".
  b) If the pass-rate drop is below 0.10, return status "no_regression".
  c) Call compare_versions. If no component changed, return status "no_component_change" with an uncertainty note (the drop may be flakiness or the environment).
  d) Gather the candidate's failed-run error events, classify and fingerprint them, and group by fingerprint. Count failed runs that have no error event as "unexplained".
  e) Score each changed component:
     timing = 1.0 if the baseline is the version immediately before the candidate (by createdAt) in the project, otherwise 0.5.
     patternMatch = failed runs with at least one matching error event / total failed runs. For tools, an error matches only if its pattern maps to tools AND its tool is in the changed tools (or the tool is unknown).
     exclusivity = 1 / number of changed components.
     score = 0.4*timing + 0.4*patternMatch + 0.2*exclusivity.
     If flaky data exists for the baseline, multiply by (1 - 0.5*flakyRate); otherwise skip and add an uncertainty note saying flakiness was not assessed.
     confidence: "high" if score >= 0.75 and matching failed runs >= 5; "medium" if score >= 0.5; otherwise "low".
  f) evidenceRefs = up to 10 REAL eventId values of the matching error events, ordered by ts.
  g) reason = a sentence built from the data by template, for example naming the changed tool and renamed parameter from toolDiff, the number of matching failures out of the total, and what did not change.
  h) Add uncertainty notes when the top score is below 0.5, when matching failed runs are fewer than 5, or when the top two suspects are within 0.1 of each other (ambiguous).
  i) If save is true, upsert one finding per suspect idempotently using the unique findings index, status "open".
  Return: {status, baselineVersionId, candidateVersionId, passRates: {baseline, candidate}, drop, changedComponents, suspects: [{component, detail, score, scoreBreakdown: {timing, patternMatch, exclusivity}, confidence, matchingFailedRuns, totalFailedRuns, fingerprints: [{fingerprint, pattern, tool, count}], evidenceRefs, reason}], uncertainty: [str], limits: "Likely cause from historical evidence, not proof."}

verify_fix(db, project_id, bad_version_id, fixed_version_id, baseline_version_id=None, min_runs=10) -> dict
  Compare pass rates and fingerprint counts of the bad and fixed versions. The "top fingerprints" are those making up the first 80 percent of the bad version's failures.
  result "resolved": the fixed version has at least min_runs runs, AND its pass rate is within 0.05 of the baseline's (if a baseline is given; otherwise at least 0.30 above the bad version), AND the top fingerprints dropped by 80 percent or more.
  result "remains": the pass rate improved by less than 0.10, or the top fingerprints dropped by less than 30 percent.
  result "inconclusive": everything else, or fewer than min_runs runs in the fixed version, or flakiness above 0.20 when it can be computed.
  Update the matching findings' status to "verified_fixed", "still_failing" or "inconclusive". Return the numbers behind the decision.

SECONDARY (only after the core tests pass):
flaky_report(db, project_id, version_id): group runs by (manifestHash, caseId); a case is flaky only if it has at least 2 attempts with both pass and fail; if no case has repeated attempts, return {"status": "not_enough_repeats"}.
blast_radius(db, project_id, component_or_tool): read projects.dependencyMap; if it is missing, return {"status": "no_dependency_map"}; never invent dependencies.
release_verdict(...) and explain_finding(...): template only, no LLM.

8. DEMO DATA (script: scripts/seed_demo.py; the analysis must compute everything from this data)
Project "orderbot". Three versions with real stored manifests, versionIds "A", "B", "C".
- A: tools get_order(order_id), refund_order(order_id), search_policy(query). Works.
- B: identical to A except get_order now requires "orderId" instead of "order_id" (the agent still sends order_id). Prompt, model, retrieval and code are unchanged.
- C: the fix; the agent sends orderId and the schema matches.
20 cases (caseIds c01 to c20) with 3 attempts each = 60 runs per version, using a fixed random seed. Cases c01 to c12 exercise get_order (or refund_order, which calls get_order), the rest do not.
- Version A: nearly all pass, with 1 or 2 incidental timeout failures, and one case that genuinely alternates pass and fail across attempts (a real flaky case).
- Version B: every attempt of c01 to c12 fails with an error event: tool get_order, message "missing required argument: orderId" (vary the digits or IDs in nearby text so normalization is exercised); other cases pass, apart from 1 or 2 timeouts.
- Version C: nearly all pass.
Each run emits events with increasing seq (user_input, tool_call, then tool_result or error, then output). Insert everything through insert_events_safe. Add projects.dependencyMap {"get_order": ["refund_order", "order_tracking_workflow"]}.
Expected behavior to ASSERT IN TESTS, never to hardcode in analysis code: find_suspects(A, B) ranks "tools" first with high confidence, its evidenceRefs are real error eventIds in the database, and toolDiff shows get_order with possibleRename [order_id, orderId]; verify_fix(B, C, baseline A) returns "resolved".

9. TESTS (pytest; use a real Atlas test database named direly_test_<random> created per session and dropped at the end; do NOT use mongomock because $setWindowFields, $merge and validators must be real)
- Failure grouping: the same underlying error with different numbers or IDs produces one fingerprint; different errors produce different ones.
- classify_error: at least one case per pattern in the taxonomy.
- Suspect ranking: the demo data gives tools first, evidenceRefs all exist and belong to failed runs of version B, and a case with two changed components gives lower exclusivity.
- Insufficient evidence: fewer than min_runs runs returns "insufficient_evidence", and a nearly equal pass rate returns "no_regression".
- Duplicate events: inserting the same batch twice gives inserted 0 and duplicates N the second time, and the collection count does not change.
- Invalid data: an event without runId, and an event with an unknown type, both land in rejected with a reason and are not stored.
- Version comparison: changedComponents is exactly ["tools"] for A vs B, toolDiff shows the rename, and a missing version raises ValueError.
- verify_fix: B to C gives "resolved"; B to B gives "remains".

10. FILES AND SETUP (exact paths)
backend/app/db.py (client, collections, validators, indexes, setup function)
backend/app/analysis/__init__.py
backend/app/analysis/patterns.py (classify_error, fingerprint_error)
backend/app/analysis/event_store.py (insert_events_safe)
backend/app/analysis/stats.py (aggregation pipelines as Python lists, plus the equivalent mongosh snippets in comments)
backend/app/analysis/compare.py (compare_versions)
backend/app/analysis/culprit.py (find_suspects)
backend/app/analysis/verify.py (verify_fix)
backend/app/analysis/flaky.py and blast.py (secondary)
scripts/seed_demo.py
tests/test_patterns.py, tests/test_event_store.py, tests/test_compare.py, tests/test_culprit.py, tests/test_verify.py, tests/conftest.py
requirements.txt (pymongo[srv], python-dotenv, pytest, fastapi, uvicorn)
.env.example with MONGODB_URI and DB_NAME=direly (placeholders only)
SETUP.md containing the exact setup steps and commands: create a free Atlas M0 cluster, create a database user, allow network access (0.0.0.0/0 for the hackathon only), copy the connection string into .env, create a virtual environment, install requirements, run the setup function, run the seed script, run the tests, and mongosh commands to verify indexes and validators.
I will create the real .env file and do the Atlas website steps myself. Never create a .env containing a real connection string.

11. HOW TO WORK (you are an agent inside my project folder)
- Create and edit the files directly at the exact paths in section 10. Do not paste whole files into chat.
- Work in this step order: (1) setup, requirements, .env.example, SETUP.md; (2) db.py; (3) patterns.py and event_store.py; (4) stats.py; (5) compare.py; (6) culprit.py; (7) verify.py; (8) seed_demo.py; (9) tests.
- After each step, run the relevant tests or commands, fix failures yourself, and give me a short summary: files changed, command run, result.
- Stop after step 9 and wait for me to confirm before building the secondary features.
- Before you start, list at most 5 assumptions. Ask me a question only if you are truly blocked.
- Never print, log or commit my real MongoDB connection string. Read it only from the .env file, which I will create myself.
- Do not run destructive commands on any database except the temporary test database named direly_test_<random>.
- Every function needs a docstring with its input and return shape.

12. DO NOT
- Do not hardcode any suspect, fingerprint, score or expected result inside analysis code.
- Do not build API routes, a separate backend or a frontend.
- Do not rename collections or fields, or add required fields.
- Do not use an LLM, mongomock, or features that Atlas M0 lacks.
- Do not invent flaky results or dependencies when the data is missing; return the "not enough data" statuses defined above.
- Do not claim measured performance numbers.

DONE MEANS
Running the seed script, then find_suspects on A vs B, returns "tools" as the top suspect with high confidence and real evidence event IDs; verify_fix on B to C returns "resolved"; duplicate events are counted and not stored twice; invalid events are rejected with reasons; all tests pass.

Start now: list your assumptions, then begin step 1.
