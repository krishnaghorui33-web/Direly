"""Aggregation pipelines for version success rates and failure fingerprint statistics."""

from typing import Any, Dict, List, Optional
from pymongo.database import Database


def success_rate_by_version(db: Database, project_id: str) -> List[Dict[str, Any]]:
    """Compute pass rates across versions for a project, ordered by version createdAt.

    Equivalent mongosh snippet:
    -------------------------------------------------------------------------
    db.runs.aggregate([
      { $match: { projectId: "orderbot" } },
      { $group: {
          _id: "$versionId",
          runs: { $sum: 1 },
          passes: { $sum: { $cond: [{ $eq: ["$status", "pass"] }, 1, 0] } },
          failures: { $sum: { $cond: [{ $eq: ["$status", "fail"] }, 1, 0] } }
      } },
      { $lookup: {
          from: "versions",
          localField: "_id",
          foreignField: "_id",
          as: "verDoc"
      } },
      { $unwind: { path: "$verDoc", preserveNullAndEmptyArrays: true } },
      { $sort: { "verDoc.createdAt": 1, _id: 1 } },
      { $project: {
          _id: 0,
          versionId: "$_id",
          runs: 1,
          passes: 1,
          failures: 1,
          passRate: {
            $cond: [
              { $gt: ["$runs", 0] },
              { $divide: ["$passes", "$runs"] },
              0.0
            ]
          }
      } }
    ]);
    -------------------------------------------------------------------------

    Args:
        db (Database): PyMongo Database instance.
        project_id (str): Identifier of target project.

    Returns:
        List[Dict[str, Any]]: List of {versionId, runs, passes, failures, passRate}
                              ordered by version createdAt.
    """
    pipeline = [
        {"$match": {"projectId": project_id}},
        {
            "$group": {
                "_id": "$versionId",
                "runs": {"$sum": 1},
                "passes": {"$sum": {"$cond": [{"$eq": ["$status", "pass"]}, 1, 0]}},
                "failures": {"$sum": {"$cond": [{"$eq": ["$status", "fail"]}, 1, 0]}},
            }
        },
        {
            "$lookup": {
                "from": "versions",
                "localField": "_id",
                "foreignField": "_id",
                "as": "verDoc",
            }
        },
        {"$unwind": {"path": "$verDoc", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"verDoc.createdAt": 1, "_id": 1}},
        {
            "$project": {
                "_id": 0,
                "versionId": "$_id",
                "runs": 1,
                "passes": 1,
                "failures": 1,
                "passRate": {
                    "$cond": [
                        {"$gt": ["$runs", 0]},
                        {"$divide": ["$passes", "$runs"]},
                        0.0,
                    ]
                },
            }
        },
    ]

    return list(db["runs"].aggregate(pipeline))


def failure_counts_by_fingerprint(
    db: Database,
    project_id: str,
    version_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Aggregate failure counts grouped by versionId and failure fingerprint.

    Equivalent mongosh snippet:
    -------------------------------------------------------------------------
    db.events.aggregate([
      { $match: {
          projectId: "orderbot",
          type: "error",
          ...(versionId ? { versionId: versionId } : {}),
          "payload.fingerprint": { $ne: null }
      } },
      { $group: {
          _id: { versionId: "$versionId", fingerprint: "$payload.fingerprint" },
          pattern: { $first: "$payload.pattern" },
          tool: { $first: "$payload.tool" },
          count: { $sum: 1 }
      } },
      { $sort: { count: -1, "_id.fingerprint": 1 } },
      { $project: {
          _id: 0,
          versionId: "$_id.versionId",
          fingerprint: "$_id.fingerprint",
          pattern: { $ifNull: ["$pattern", "other"] },
          tool: "$tool",
          count: "$count"
      } }
    ]);
    -------------------------------------------------------------------------

    Args:
        db (Database): PyMongo Database instance.
        project_id (str): Identifier of target project.
        version_id (Optional[str]): Optional filter for specific version ID.

    Returns:
        List[Dict[str, Any]]: List of {versionId, fingerprint, pattern, tool, count}.
    """
    match_criteria: Dict[str, Any] = {
        "projectId": project_id,
        "type": "error",
        "payload.fingerprint": {"$ne": None},
    }
    if version_id is not None:
        match_criteria["versionId"] = version_id

    pipeline = [
        {"$match": match_criteria},
        {
            "$group": {
                "_id": {
                    "versionId": "$versionId",
                    "fingerprint": "$payload.fingerprint",
                },
                "pattern": {"$first": "$payload.pattern"},
                "tool": {"$first": "$payload.tool"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1, "_id.fingerprint": 1}},
        {
            "$project": {
                "_id": 0,
                "versionId": "$_id.versionId",
                "fingerprint": "$_id.fingerprint",
                "pattern": {"$ifNull": ["$pattern", "other"]},
                "tool": "$tool",
                "count": "$count",
            }
        },
    ]

    return list(db["events"].aggregate(pipeline))
