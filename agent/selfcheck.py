"""No-database proof that the agent behaves correctly across versions.

Run with:  python -m agent.selfcheck

This is the check that matters most, because it needs no Atlas connection and no
MongoDB. It exercises the agent directly and asserts that:

  * version A passes an order lookup,
  * version B fails it with a message that classifies as invalid_tool_args,
  * version C passes it again,
  * all 36 version-B failures collapse to a single failure fingerprint, which is
    what verify_fix's "top fingerprints cover the first 80% of failures" logic
    depends on,
  * injected timeouts classify as ``timeout`` and not as invalid_tool_args.

Exit code is non-zero if any assertion fails, so it is usable in CI.
"""

import sys
from collections import Counter
from datetime import datetime, timedelta, timezone

from agent.agent import OrderBot
from agent.manifests import build_manifest_components
from backend.app.analysis.patterns import classify_error, fingerprint_error

BASE_TIME = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)


def _error_events(trace):
    """Extract error event payloads from a trace.

    Args:
        trace (AgentTrace): A completed agent trace.

    Returns:
        list: The payloads of the trace's error events.
    """
    return [e.payload for e in trace.events if e.type == "error"]


def main() -> int:
    """Run the no-database agent verification.

    Returns:
        int: 0 if every assertion held, 1 otherwise.
    """
    failures = []

    def check(label, condition, detail=""):
        """Record the outcome of one assertion.

        Args:
            label (str): What is being asserted.
            condition (bool): Whether it held.
            detail (str): Extra context printed on failure.
        """
        mark = "PASS" if condition else "FAIL"
        print(f"  [{mark}] {label}" + (f"  -- {detail}" if detail and not condition else ""))
        if not condition:
            failures.append(label)

    print("OrderBot agent selfcheck (no database required)\n")

    print("Manifest contract:")
    from backend.app.analysis.compare import compute_manifest_hashes, diff_tools

    a, b, c = (build_manifest_components(v) for v in ("A", "B", "C"))
    diff = diff_tools(a["tools"], b["tools"])
    get_order = diff["changedTools"].get("get_order", {})
    check("A vs B changes only the get_order parameter name",
          diff["addedTools"] == [] and diff["removedTools"] == [] and get_order.get("possibleRename") == ["order_id", "orderId"])
    check("possibleRename survives (exactly one param renamed)",
          get_order.get("possibleRename") == ["order_id", "orderId"], str(get_order))
    changed = [k for k in ("prompt", "tools", "model", "retrieval", "code")
               if compute_manifest_hashes(a)["hashes"][k] != compute_manifest_hashes(b)["hashes"][k]]
    check("changedComponents for A vs B is exactly ['tools']", changed == ["tools"], str(changed))
    check("model name is gpt-4o", b["model"]["name"] == "gpt-4o", str(b["model"]))

    print("\nAgent behaviour per version:")
    traces = {}
    for version_id in ("A", "B", "C"):
        bot = OrderBot(build_manifest_components(version_id), version_id)
        traces[version_id] = bot.run("Can you check the status of order ord_c01?", "c01", 1, BASE_TIME)
        status = traces[version_id].status
        expected = "fail" if version_id == "B" else "pass"
        check(f"version {version_id} -> {expected}", status == expected, f"got {status}")

    b_errors = _error_events(traces["B"])
    check("version B produced exactly one error event", len(b_errors) == 1, str(len(b_errors)))
    if b_errors:
        message = b_errors[0]["message"]
        print(f"        message: {message}")
        classification = classify_error({"payload": b_errors[0]})
        check("version B error classifies as invalid_tool_args",
              classification["pattern"] == "invalid_tool_args", classification["pattern"])
        check("version B error is attributed to get_order",
              classification["tool"] == "get_order", str(classification["tool"]))

    print("\nTaxonomy branches that the demo data exercises:")
    samples = [
        ("missing required argument 'orderId' for get_order", "invalid_tool_args"),
        ("unexpected argument 'order_id' for get_order", "invalid_tool_args"),
        ("invalid argument 'order_id' for get_order: expected string, got int", "invalid_tool_args"),
        ("unknown tool order_lookuper", "tool_not_found"),
        ("retrieval returned 0 documents for index order_policies_v2", "retrieval_empty"),
        ("upstream gateway timed out after 30000ms", "timeout"),
        ("agent called the wrong tool for this request", "wrong_tool"),
        ("disk cache unavailable", "other"),
    ]
    for message, expected_pattern in samples:
        got = classify_error({"payload": {"message": message, "tool": "get_order"}})["pattern"]
        check(f"{expected_pattern:18} <- {message[:52]}", got == expected_pattern, got)

    print("\nFingerprint collapse across the 36 version-B failures:")
    fingerprints = Counter()
    for i in range(1, 13):
        for attempt in (1, 2, 3):
            bot = OrderBot(build_manifest_components("B"), "B")
            case_id = f"c{i:02d}"
            trace = bot.run(f"Please check order ord_{case_id} status", case_id, attempt, BASE_TIME)
            for payload in _error_events(trace):
                event = {"payload": {**payload}}
                fingerprints[fingerprint_error(event)] += 1
    check("all 36 failures share one fingerprint", len(fingerprints) == 1,
          f"{len(fingerprints)} distinct: {dict(list(fingerprints.items())[:3])}")
    if len(fingerprints) == 1:
        print(f"        fingerprint: {next(iter(fingerprints))} x{next(iter(fingerprints.values()))}")

    print("\nInjected environment fault:")
    bot = OrderBot(build_manifest_components("A"), "A")
    timed_out = bot.run(
        "Can you check the status of order ord_c13?",
        "c13",
        2,
        BASE_TIME,
        timeout_tool="get_order",
        timeout_message="upstream gateway timed out after 30000ms",
    )
    timeout_payloads = _error_events(timed_out)
    check("injected timeout produces an error event", len(timeout_payloads) == 1)
    if timeout_payloads:
        got = classify_error({"payload": timeout_payloads[0]})["pattern"]
        check("timeout classifies as timeout, not invalid_tool_args", got == "timeout", got)
    check("latency is an int, never a float",
          isinstance(timed_out.latency_ms, int) and not isinstance(timed_out.latency_ms, float))

    print("\nEvent ordering:")
    bot = OrderBot(build_manifest_components("A"), "A")
    ordered = bot.run("What is your refund window?", "c13", 1, BASE_TIME)
    offsets = [e.offset_ms for e in ordered.events]
    check("event offsets are strictly increasing", all(x < y for x, y in zip(offsets, offsets[1:])),
          str(offsets))
    check("emits prompt and retrieval events",
          {e.type for e in ordered.events} >= {"user_input", "prompt", "retrieval", "tool_call", "tool_result", "output"},
          str(sorted({e.type for e in ordered.events})))

    print()
    if failures:
        print(f"{len(failures)} check(s) FAILED:")
        for name in failures:
            print(f"  - {name}")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())