"""Deterministic policy retrieval for OrderBot.

Stands in for the vector index named by the manifest's retrieval component. It
is intentionally simple and fully deterministic: the same query always returns
the same documents in the same order, which is what makes the demo reproducible.

The retrieved documents are what the agent quotes back in its answer, and the
retrieval step is what emits the ``retrieval`` lifecycle event that the current
seeder never produces.
"""

from typing import Any, Dict, List

_POLICY_DOCS: List[Dict[str, str]] = [
    {"id": "pol-001", "title": "Standard refund window", "body": "Refunds are accepted within 30 days of delivery."},
    {"id": "pol-002", "title": "Return shipping", "body": "Return shipping is free for damaged items."},
    {"id": "pol-003", "title": "Exchange policy", "body": "Exchanges require an unused item in original packaging."},
    {"id": "pol-004", "title": "Order status definitions", "body": "Shipped means the parcel has left the warehouse."},
    {"id": "pol-005", "title": "Failed delivery", "body": "A failed delivery attempt is retried within 48 hours."},
    {"id": "pol-006", "title": "Address changes", "body": "Address changes are allowed before dispatch only."},
]


def retrieve(query: str, index: str, top_k: int) -> List[Dict[str, Any]]:
    """Retrieve policy documents for a query.

    Ranks documents by how many of their words appear in the query, which is a
    cheap stand-in for embedding similarity but keeps results deterministic and
    explainable. Ties break on document id so ordering never depends on dict
    iteration order.

    Args:
        query (str): The user's natural-language question.
        index (str): The retrieval index name from the manifest. Only
            "order_policies_v1" is populated; any other index returns nothing,
            which is how an index swap would surface as an empty retrieval.
        top_k (int): Maximum number of documents to return.

    Returns:
        List[Dict[str, Any]]: Up to top_k documents, each with id, title, body
            and score, ordered by descending score then ascending id.
    """
    if index != "order_policies_v1":
        return []

    query_words = {w for w in query.lower().split() if w}

    scored: List[Dict[str, Any]] = []
    for doc in _POLICY_DOCS:
        haystack = f"{doc['title']} {doc['body']}".lower()
        score = sum(1 for word in query_words if word in haystack)
        if score > 0:
            scored.append(
                {"id": doc["id"], "title": doc["title"], "body": doc["body"], "score": score}
            )

    scored.sort(key=lambda d: (-d["score"], d["id"]))
    return scored[: max(0, top_k)]


def summarize_documents(documents: List[Dict[str, Any]]) -> str:
    """Render retrieved documents as a single answer string.

    Args:
        documents (List[Dict[str, Any]]): Documents returned by retrieve().

    Returns:
        str: A short policy answer, or an explicit no-documents message.
    """
    if not documents:
        return "No relevant policy documents were found for that request."
    top = documents[0]
    return f"{top['title']}: {top['body']}"