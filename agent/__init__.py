"""OrderBot: the sample AI agent under evaluation.

This package contains a real, deterministic, locally-executing agent plus the
tool schemas that describe it. Nothing here talks to an external model API; the
agent loop is ordinary Python so that every run is reproducible and so that
failures are genuine (the version B regression is produced by the agent actually
calling get_order with a parameter the schema no longer accepts, not by a fault
rule hardcoding an outcome).

Layout:
    manifests.py  - the three version manifests (A, B, C) and tool schemas
    tools.py      - tool implementations plus the argument validator
    retrieval.py  - deterministic policy-document lookup
    agent.py      - the agent loop, which emits a trace of lifecycle events
    selfcheck.py  - no-database proof that the agent fails on B for the right reason
"""

from agent.manifests import (
    COMPONENT_KEYS,
    build_manifest_components,
    get_tool_schema,
    manifest_for,
)
from agent.agent import OrderBot, AgentTrace, TraceEvent

__all__ = [
    "COMPONENT_KEYS",
    "build_manifest_components",
    "get_tool_schema",
    "manifest_for",
    "OrderBot",
    "AgentTrace",
    "TraceEvent",
]