"""The OrderBot agent loop.

A real, deterministic agent: it reads a case, retrieves policy context, decides
which tool to call, produces arguments, and hands them to the tool layer for
validation and execution. It emits a trace of lifecycle events as it goes, which
the runner converts into the ``events`` documents MongoDB stores.

The important property is that the agent's *tool-selection and argument-building
code is version-independent*. The version manifest decides which schemas exist
and what they require. So on version B the agent still decides to call get_order
and still builds the argument it always built; the manifest no longer accepts
that argument name, and ``validate_args`` rejects it. The failure is produced by
the system actually disagreeing with itself, not by a rule that says "B fails".
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from agent.manifests import get_agent_param_name, get_tool_schema
from agent.retrieval import retrieve, summarize_documents
from agent.tools import (
    ToolNotFoundError,
    ToolTimeout,
    ToolValidationError,
    execute_tool,
    sha1_hex,
)


@dataclass
class TraceEvent:
    """One lifecycle event produced during a run.

    Attributes:
        type (str): One of the seven event types in the DIRELY contract.
        payload (Dict[str, Any]): Event-specific body.
        offset_ms (int): Milliseconds after the run started. Strictly increasing
            across the run, so event ordering by ts is deterministic.
    """

    type: str
    payload: Dict[str, Any]
    offset_ms: int


@dataclass
class AgentTrace:
    """The complete record of one agent execution.

    Attributes:
        events (List[TraceEvent]): Lifecycle events in order.
        status (str): "pass" or "fail".
        failed_checks (List[str]): Names of checks that did not hold.
        output (str): The agent's final answer.
        latency_ms (int): Total wall time, always an int (never a float, which
            the runs validator would reject).
    """

    events: List[TraceEvent] = field(default_factory=list)
    status: str = "pass"
    failed_checks: List[str] = field(default_factory=list)
    output: str = ""
    latency_ms: int = 0

    def emit(self, event_type: str, payload: Dict[str, Any], offset_ms: int) -> None:
        """Append a lifecycle event to the trace.

        Args:
            event_type (str): One of the seven DIRELY event types.
            payload (Dict[str, Any]): Event body.
            offset_ms (int): Milliseconds since run start.
        """
        self.events.append(TraceEvent(type=event_type, payload=payload, offset_ms=offset_ms))


class OrderBot:
    """The deterministic order-support agent.

    Args:
        components (Dict[str, Any]): A version manifest's components dict.
        version_id (str): Version identifier, used only for logging and for
            choosing the argument spelling the agent believes is correct.
    """

    def __init__(self, components: Dict[str, Any], version_id: str):
        self.components = components
        self.version_id = version_id
        self.retrieval_cfg = components.get("retrieval") or {}
        self.prompt = components.get("prompt") or ""
        self.model_cfg = components.get("model") or {}

    def _param_name_for_version(self) -> str:
        """Return the argument name this agent version's CODE uses for get_order.

        This is intentionally decoupled from what the active schema requires.
        Version B's schema demands "orderId" but this code still emits
        "order_id", and validate_args rejects the call. That divergence is the
        regression the whole product is built to detect, so it has to arise
        from two independent sources rather than by echoing the schema back.

        Returns:
            str: "orderId" for version C, "order_id" otherwise.
        """
        return get_agent_param_name(self.version_id)

    def _plan(self, user_input: str, order_id: Optional[str]) -> List[Dict[str, Any]]:
        """Decide which tool calls this input needs, in order.

        The plan depends only on the input, not on the manifest, so it is
        identical across A, B and C. That is what makes the version difference
        show up as an argument-validation failure rather than a different code
        path.

        A refund is a two-call chain: refund_order needs the order record, so it
        first calls get_order. This mirrors the dependencyMap entry
        {"get_order": ["refund_order", ...]} and is why a get_order schema
        regression also breaks the refund cases rather than sparing them.

        Args:
            user_input (str): The user's question.
            order_id (Optional[str]): Order identifier extracted from the input.

        Returns:
            List[Dict[str, Any]]: Planned calls in execution order, each
                {"tool", "args}.
        """
        lowered = user_input.lower()
        get_order_call = {
            "tool": "get_order",
            "args": {self._param_name_for_version(): order_id},
        }

        if "refund" in lowered and order_id:
            return [
                get_order_call,
                {"tool": "refund_order", "args": {"order_id": order_id, "reason": "customer_request"}},
            ]
        if order_id and ("order" in lowered or "status" in lowered or "track" in lowered):
            return [get_order_call]
        return [{"tool": "search_policy", "args": {"query": user_input}}]

    def _extract_order_id(self, user_input: str) -> Optional[str]:
        """Pull an order identifier out of the user input.

        Order ids in the case suite look like "ord_c01"; the extraction is a
        plain regex over that shape rather than anything learned.

        Args:
            user_input (str): The user's question.

        Returns:
            Optional[str]: The extracted identifier, or None.
        """
        for token in user_input.replace(",", " ").replace("?", " ").split():
            candidate = token.strip("\"'.,!")
            if candidate.lower().startswith("ord_") and len(candidate) > 4:
                return candidate
        return None

    def run(
        self,
        user_input: str,
        case_id: str,
        attempt: int,
        started_at: datetime,
        timeout_tool: Optional[str] = None,
        timeout_message: Optional[str] = None,
    ) -> AgentTrace:
        """Execute one case and return its full trace.

        Args:
            user_input (str): The user's question.
            case_id (str): Case identifier, e.g. "c01".
            attempt (int): 1-based attempt number.
            started_at (datetime): Run start time, used to stamp events.
            timeout_tool (Optional[str]): Tool that should stall, for injected
                environment flakiness. If it does not appear in this case's
                plan, the first planned call stalls instead, so the fault is
                honoured regardless of which tools the case reaches.
            timeout_message (Optional[str]): Message for the injected timeout.
                Wording must avoid "validation" and "schema", because
                classify_error tests the invalid_tool_args branch before the
                timeout branch and would misclassify it.

        Returns:
            AgentTrace: Events, status, failed checks, output and latency.
        """
        trace = AgentTrace()
        clock = 0

        def step(delta: int) -> int:
            """Advance the internal monotonic clock.

            Args:
                delta (int): Milliseconds to advance.

            Returns:
                int: The new offset.
            """
            nonlocal clock
            clock += delta
            return clock

        trace.emit("user_input", {"text": user_input, "caseId": case_id}, step(5))

        trace.emit(
            "prompt",
            {
                "template": self.prompt,
                "model": self.model_cfg.get("name"),
                "temperature": self.model_cfg.get("temperature"),
                "activeTools": [t.get("name") for t in self.components.get("tools", [])],
            },
            step(12),
        )

        order_id = self._extract_order_id(user_input)
        index = self.retrieval_cfg.get("index", "")
        top_k = self.retrieval_cfg.get("topK", 3)
        documents = retrieve(user_input, index, top_k)
        trace.emit(
            "retrieval",
            {
                "index": index,
                "topK": top_k,
                "query": user_input,
                "documentIds": [d["id"] for d in documents],
                "resultCount": len(documents),
            },
            step(18),
        )

        plan = self._plan(user_input, order_id)
        stall_target = timeout_tool
        if stall_target is not None and stall_target not in {c["tool"] for c in plan}:
            # The fault names a tool this case never reaches (policy questions do
            # not touch get_order). Stall its first call instead, so injected
            # flakiness is honoured wherever it is aimed.
            stall_target = plan[0]["tool"]

        for call in plan:
            tool_name = call["tool"]
            args = call["args"]
            schema = get_tool_schema(self.components, tool_name)

            trace.emit(
                "tool_call",
                {"tool": tool_name, "args": args, "schemaAccepted": schema is not None},
                step(9),
            )

            injected = timeout_message if (stall_target == tool_name) else None

            try:
                result = execute_tool(tool_name, schema, args, timeout_message=injected)
            except ToolValidationError as exc:
                # Message wording is load-bearing: "missing required argument"
                # is what lands this in the invalid_tool_args taxonomy branch.
                trace.emit(
                    "error",
                    {
                        "tool": exc.tool,
                        "message": exc.errors[0],
                        "errorType": "ToolValidationError",
                        "violations": exc.errors,
                        "attempt": attempt,
                        "requestId": sha1_hex(f"{case_id}:{tool_name}:{attempt}")[:16],
                    },
                    step(7),
                )
                trace.emit(
                    "output",
                    {"text": "Execution failed: could not complete the requested action."},
                    step(4),
                )
                trace.status = "fail"
                trace.failed_checks = ["tool_call_succeeded"]
                trace.latency_ms = step(6)
                return trace
            except ToolTimeout as exc:
                trace.emit(
                    "error",
                    {
                        "tool": exc.tool,
                        "message": exc.message,
                        "errorType": "GatewayTimeoutError",
                        "attempt": attempt,
                        "requestId": sha1_hex(f"{case_id}:{tool_name}:{attempt}")[:16],
                    },
                    step(7),
                )
                trace.emit("output", {"text": "Execution failed: upstream did not respond."}, step(4))
                trace.status = "fail"
                trace.failed_checks = ["tool_call_succeeded"]
                trace.latency_ms = step(6)
                return trace
            except ToolNotFoundError as exc:
                trace.emit(
                    "error",
                    {"tool": exc.tool, "message": exc.message, "errorType": "ToolNotFoundError"},
                    step(7),
                )
                trace.emit("output", {"text": "Execution failed: unknown tool."}, step(4))
                trace.status = "fail"
                trace.failed_checks = ["tool_call_succeeded"]
                trace.latency_ms = step(6)
                return trace

            trace.emit("tool_result", {"tool": tool_name, "status": "success", "result": result}, step(11))

        if plan and plan[0]["tool"] == "search_policy":
            trace.output = summarize_documents(documents)
        else:
            trace.output = f"Order {order_id} processed successfully."

        trace.emit("output", {"text": trace.output}, step(6))
        trace.latency_ms = step(3)
        return trace