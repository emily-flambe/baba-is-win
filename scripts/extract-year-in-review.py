#!/usr/bin/env python3
"""
Extract 2025 year-in-review data from BigQuery.

Queries GitHub and Oura data to generate statistics for the year-in-review page.
Outputs to src/data/year-in-review-2025.json.

Usage:
    python scripts/extract-year-in-review.py

Environment variables:
    GCP_SA_KEY_FILE: Path to service account JSON file, OR
    GCP_SA_KEY: Base64-encoded service account JSON
    GCP_PROJECT_ID: Target GCP project ID
"""

import base64
import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from google.cloud import bigquery
from google.oauth2 import service_account

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Personal repos to include (emily-flambe org)
PERSONAL_REPOS = [
    "emily-flambe/baba-is-win",
    "emily-flambe/etl-for-dumdums",
    "emily-flambe/cool-scripts",
    "emily-flambe/workout-tracker",
    "emily-flambe/split-dumb",
]

# Work repos (aggregate only, no repo names exposed)
# These are stored without org prefix in BigQuery
WORK_REPOS = [
    "ddx-data-pipeline",
    "snowflake-queries",
]

# Year to extract
YEAR = 2025


def get_client() -> bigquery.Client:
    """
    Create a BigQuery client from environment variables.

    Supports two credential formats:
        - GCP_SA_KEY_FILE: Path to service account JSON file
        - GCP_SA_KEY: Base64-encoded service account JSON

    Returns:
        Authenticated BigQuery client
    """
    project_id = os.environ.get("GCP_PROJECT_ID")
    if not project_id:
        raise ValueError("GCP_PROJECT_ID environment variable is not set")

    # Try file-based credentials first
    key_file = os.environ.get("GCP_SA_KEY_FILE")
    if key_file:
        if not os.path.exists(key_file):
            raise ValueError(f"GCP_SA_KEY_FILE does not exist: {key_file}")
        credentials = service_account.Credentials.from_service_account_file(key_file)
        return bigquery.Client(credentials=credentials, project=project_id)

    # Try base64-encoded credentials
    key_b64 = os.environ.get("GCP_SA_KEY")
    if key_b64:
        sa_key_json = base64.b64decode(key_b64).decode("utf-8")
        sa_info = json.loads(sa_key_json)
        credentials = service_account.Credentials.from_service_account_info(sa_info)
        return bigquery.Client(credentials=credentials, project=project_id)

    raise ValueError("Either GCP_SA_KEY_FILE or GCP_SA_KEY environment variable must be set")


def safe_query(client: bigquery.Client, query: str, description: str) -> list[dict]:
    """Execute a query and return results as list of dicts, with error handling."""
    try:
        logger.info(f"Querying: {description}")
        result = client.query(query).result()
        rows = [dict(row) for row in result]
        logger.info(f"  -> {len(rows)} rows returned")
        return rows
    except Exception as e:
        logger.error(f"  -> Query failed: {e}")
        return []


def is_fun_commit_message(message: str) -> bool:
    """Check if a commit message is 'fun' (short, contains fix/oops, etc)."""
    if not message:
        return False
    message_lower = message.lower().strip()

    # Short messages (under 15 chars)
    if len(message_lower) < 15:
        return True

    # Contains fun keywords
    fun_patterns = [
        r"\bfix\b",
        r"\boops\b",
        r"\bwhoops\b",
        r"\bugh\b",
        r"\bwip\b",
        r"\btodo\b",
        r"\bhack\b",
        r"\bwtf\b",
        r"\blol\b",
        r"\byolo\b",
        r"^\?+$",  # Just question marks
        r"^!+$",  # Just exclamation marks
    ]
    for pattern in fun_patterns:
        if re.search(pattern, message_lower):
            return True

    # All caps (at least 3 chars)
    if len(message) >= 3 and message.isupper():
        return True

    # Contains question mark
    if "?" in message:
        return True

    return False


def extract_github_personal(client: bigquery.Client, project_id: str) -> dict[str, Any]:
    """Extract personal GitHub statistics."""
    repo_list = ", ".join([f"'{r}'" for r in PERSONAL_REPOS])

    # Total PRs and per-repo breakdown
    repo_query = f"""
    SELECT
        repo,
        COUNT(*) as pr_count,
        SUM(additions + deletions) as lines_changed
    FROM `{project_id}.github.raw_pull_requests`
    WHERE merged = TRUE
        AND repo IN ({repo_list})
        AND EXTRACT(YEAR FROM merged_at) = {YEAR}
    GROUP BY repo
    ORDER BY pr_count DESC
    """
    repo_rows = safe_query(client, repo_query, "Personal repos PR breakdown")

    total_prs = sum(r.get("pr_count", 0) for r in repo_rows)
    total_lines = sum(r.get("lines_changed", 0) for r in repo_rows)

    repos = []
    for r in repo_rows:
        repo_name = r.get("repo", "").split("/")[-1] if r.get("repo") else "unknown"
        repos.append({
            "name": repo_name,
            "prs": r.get("pr_count", 0),
            "lines_changed": r.get("lines_changed", 0),
        })

    # Fun commit messages (from PR titles as proxy)
    fun_query = f"""
    SELECT
        title,
        repo,
        number
    FROM `{project_id}.github.raw_pull_requests`
    WHERE merged = TRUE
        AND repo IN ({repo_list})
        AND EXTRACT(YEAR FROM merged_at) = {YEAR}
    ORDER BY merged_at DESC
    LIMIT 500
    """
    pr_rows = safe_query(client, fun_query, "Personal PRs for fun messages")

    fun_commits = []
    for r in pr_rows:
        title = r.get("title", "")
        if is_fun_commit_message(title):
            repo_name = r.get("repo", "").split("/")[-1] if r.get("repo") else "unknown"
            number = r.get("number", 0)
            fun_commits.append({
                "message": title,
                "repo": repo_name,
                "url": f"https://github.com/{r.get('repo')}/pull/{number}",
            })
        if len(fun_commits) >= 10:
            break

    # Busiest coding day
    busiest_query = f"""
    SELECT
        DATE(merged_at) as merge_date,
        COUNT(*) as pr_count
    FROM `{project_id}.github.raw_pull_requests`
    WHERE merged = TRUE
        AND repo IN ({repo_list})
        AND EXTRACT(YEAR FROM merged_at) = {YEAR}
    GROUP BY merge_date
    ORDER BY pr_count DESC
    LIMIT 1
    """
    busiest_rows = safe_query(client, busiest_query, "Busiest personal coding day")

    busiest_day = None
    if busiest_rows:
        row = busiest_rows[0]
        merge_date = row.get("merge_date")
        if merge_date:
            busiest_day = {
                "date": merge_date.isoformat() if hasattr(merge_date, "isoformat") else str(merge_date),
                "prs": row.get("pr_count", 0),
            }

    return {
        "total_prs": total_prs,
        "total_commits": total_lines,  # Using lines as proxy
        "repos": repos,
        "fun_commits": fun_commits,
        "busiest_day": busiest_day,
    }


def extract_github_work(client: bigquery.Client, project_id: str) -> dict[str, Any]:
    """Extract work GitHub statistics (aggregate only, no repo names)."""
    repo_list = ", ".join([f"'{r}'" for r in WORK_REPOS])
    work_query = f"""
    SELECT
        COUNT(*) as total_prs,
        SUM(additions + deletions) as total_lines
    FROM `{project_id}.github.raw_pull_requests`
    WHERE merged = TRUE
        AND repo IN ({repo_list})
        AND EXTRACT(YEAR FROM merged_at) = {YEAR}
    """
    rows = safe_query(client, work_query, "Work GitHub aggregate stats")

    if rows:
        return {
            "total_prs": rows[0].get("total_prs", 0) or 0,
            "total_commits": rows[0].get("total_lines", 0) or 0,
        }

    return {"total_prs": 0, "total_commits": 0}


def extract_oura_averages(client: bigquery.Client, project_id: str) -> dict[str, Any]:
    """Extract Oura yearly averages."""
    sleep_query = f"""
    SELECT AVG(score) as avg_sleep_score
    FROM `{project_id}.oura.raw_sleep`
    WHERE EXTRACT(YEAR FROM day) = {YEAR}
        AND score IS NOT NULL
    """

    readiness_query = f"""
    SELECT AVG(score) as avg_readiness_score
    FROM `{project_id}.oura.raw_daily_readiness`
    WHERE EXTRACT(YEAR FROM day) = {YEAR}
        AND score IS NOT NULL
    """

    activity_query = f"""
    SELECT
        AVG(steps) as avg_steps,
        SUM(steps) as total_steps,
        SUM(active_calories) as total_active_calories
    FROM `{project_id}.oura.raw_daily_activity`
    WHERE EXTRACT(YEAR FROM day) = {YEAR}
        AND steps IS NOT NULL
    """

    sleep_rows = safe_query(client, sleep_query, "Oura sleep average")
    readiness_rows = safe_query(client, readiness_query, "Oura readiness average")
    activity_rows = safe_query(client, activity_query, "Oura activity stats")

    averages = {
        "sleep_score": 0,
        "readiness_score": 0,
        "steps_daily": 0,
    }
    totals = {
        "steps": 0,
        "active_calories": 0,
    }

    if sleep_rows and sleep_rows[0].get("avg_sleep_score"):
        averages["sleep_score"] = round(sleep_rows[0]["avg_sleep_score"], 1)

    if readiness_rows and readiness_rows[0].get("avg_readiness_score"):
        averages["readiness_score"] = round(readiness_rows[0]["avg_readiness_score"], 1)

    if activity_rows and activity_rows[0]:
        row = activity_rows[0]
        if row.get("avg_steps"):
            averages["steps_daily"] = round(row["avg_steps"])
        if row.get("total_steps"):
            totals["steps"] = int(row["total_steps"])
        if row.get("total_active_calories"):
            totals["active_calories"] = int(row["total_active_calories"])

    return {"averages": averages, "totals": totals}


def extract_oura_monthly(client: bigquery.Client, project_id: str) -> list[dict]:
    """Extract Oura monthly breakdown."""
    monthly_query = f"""
    WITH sleep_monthly AS (
        SELECT
            FORMAT_DATE('%Y-%m', day) as month,
            AVG(score) as sleep_score
        FROM `{project_id}.oura.raw_sleep`
        WHERE EXTRACT(YEAR FROM day) = {YEAR}
            AND score IS NOT NULL
        GROUP BY month
    ),
    readiness_monthly AS (
        SELECT
            FORMAT_DATE('%Y-%m', day) as month,
            AVG(score) as readiness_score
        FROM `{project_id}.oura.raw_daily_readiness`
        WHERE EXTRACT(YEAR FROM day) = {YEAR}
            AND score IS NOT NULL
        GROUP BY month
    ),
    activity_monthly AS (
        SELECT
            FORMAT_DATE('%Y-%m', day) as month,
            AVG(score) as activity_score,
            AVG(steps) as avg_steps
        FROM `{project_id}.oura.raw_daily_activity`
        WHERE EXTRACT(YEAR FROM day) = {YEAR}
            AND score IS NOT NULL
        GROUP BY month
    )
    SELECT
        COALESCE(s.month, r.month, a.month) as month,
        s.sleep_score,
        r.readiness_score,
        a.activity_score,
        a.avg_steps
    FROM sleep_monthly s
    FULL OUTER JOIN readiness_monthly r ON s.month = r.month
    FULL OUTER JOIN activity_monthly a ON COALESCE(s.month, r.month) = a.month
    ORDER BY month
    """
    rows = safe_query(client, monthly_query, "Oura monthly breakdown")

    month_labels = {
        "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
        "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
        "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
    }

    monthly = []
    for r in rows:
        month = r.get("month", "")
        month_num = month.split("-")[-1] if month else ""
        monthly.append({
            "month": month,
            "month_label": month_labels.get(month_num, month_num),
            "sleep_score": round(r.get("sleep_score", 0) or 0, 1),
            "readiness_score": round(r.get("readiness_score", 0) or 0, 1),
            "activity_score": round(r.get("activity_score", 0) or 0, 1),
            "avg_steps": round(r.get("avg_steps", 0) or 0),
        })

    return monthly


def extract_correlation_data(client: bigquery.Client, project_id: str) -> list[dict]:
    """Extract daily correlation data between temperature deviation and lines merged."""
    # Get temperature deviation from readiness data
    temp_query = f"""
    SELECT
        day,
        temperature_deviation
    FROM `{project_id}.oura.raw_daily_readiness`
    WHERE EXTRACT(YEAR FROM day) = {YEAR}
        AND temperature_deviation IS NOT NULL
    """

    # Get lines merged per day from PRs (personal repos only)
    repo_list = ", ".join([f"'{r}'" for r in PERSONAL_REPOS])
    lines_query = f"""
    SELECT
        DATE(merged_at) as day,
        SUM(additions + deletions) as lines_merged
    FROM `{project_id}.github.raw_pull_requests`
    WHERE merged = TRUE
        AND repo IN ({repo_list})
        AND EXTRACT(YEAR FROM merged_at) = {YEAR}
    GROUP BY day
    """

    temp_rows = safe_query(client, temp_query, "Temperature deviation data")
    lines_rows = safe_query(client, lines_query, "Lines merged per day")

    # Build lookup for lines merged
    lines_by_day = {}
    for r in lines_rows:
        day = r.get("day")
        if day:
            day_str = day.isoformat() if hasattr(day, "isoformat") else str(day)
            lines_by_day[day_str] = r.get("lines_merged", 0)

    correlation_data = []
    for r in temp_rows:
        day = r.get("day")
        if day:
            day_str = day.isoformat() if hasattr(day, "isoformat") else str(day)
            temp_dev = r.get("temperature_deviation", 0)
            lines = lines_by_day.get(day_str, 0)

            correlation_data.append({
                "date": day_str,
                "temp_deviation": round(temp_dev, 2) if temp_dev else 0,
                "lines_merged": lines or 0,
            })

    return sorted(correlation_data, key=lambda x: x["date"])


def extract_oura_fun_facts(client: bigquery.Client, project_id: str) -> dict[str, Any]:
    """Extract Oura fun facts (best/worst sleep, most steps)."""
    best_sleep_query = f"""
    SELECT day, score
    FROM `{project_id}.oura.raw_sleep`
    WHERE EXTRACT(YEAR FROM day) = {YEAR}
        AND score IS NOT NULL
    ORDER BY score DESC
    LIMIT 1
    """

    worst_sleep_query = f"""
    SELECT day, score
    FROM `{project_id}.oura.raw_sleep`
    WHERE EXTRACT(YEAR FROM day) = {YEAR}
        AND score IS NOT NULL
    ORDER BY score ASC
    LIMIT 1
    """

    most_steps_query = f"""
    SELECT day, steps
    FROM `{project_id}.oura.raw_daily_activity`
    WHERE EXTRACT(YEAR FROM day) = {YEAR}
        AND steps IS NOT NULL
    ORDER BY steps DESC
    LIMIT 1
    """

    best_sleep_rows = safe_query(client, best_sleep_query, "Best sleep night")
    worst_sleep_rows = safe_query(client, worst_sleep_query, "Worst sleep night")
    most_steps_rows = safe_query(client, most_steps_query, "Most steps day")

    fun_facts = {
        "best_sleep": None,
        "worst_sleep": None,
        "most_steps_day": None,
    }

    if best_sleep_rows:
        row = best_sleep_rows[0]
        day = row.get("day")
        if day:
            fun_facts["best_sleep"] = {
                "date": day.isoformat() if hasattr(day, "isoformat") else str(day),
                "score": row.get("score", 0),
            }

    if worst_sleep_rows:
        row = worst_sleep_rows[0]
        day = row.get("day")
        if day:
            fun_facts["worst_sleep"] = {
                "date": day.isoformat() if hasattr(day, "isoformat") else str(day),
                "score": row.get("score", 0),
            }

    if most_steps_rows:
        row = most_steps_rows[0]
        day = row.get("day")
        if day:
            fun_facts["most_steps_day"] = {
                "date": day.isoformat() if hasattr(day, "isoformat") else str(day),
                "steps": row.get("steps", 0),
            }

    return fun_facts


def main():
    """Main entry point."""
    try:
        client = get_client()
        project_id = os.environ.get("GCP_PROJECT_ID")
    except ValueError as e:
        logger.error(f"Failed to initialize BigQuery client: {e}")
        # Output empty structure on failure
        output_empty_structure()
        return 1

    logger.info(f"Extracting {YEAR} year-in-review data from BigQuery...")

    # Extract all data
    github_personal = extract_github_personal(client, project_id)
    github_work = extract_github_work(client, project_id)

    oura_stats = extract_oura_averages(client, project_id)
    oura_monthly = extract_oura_monthly(client, project_id)
    correlation_data = extract_correlation_data(client, project_id)
    oura_fun_facts = extract_oura_fun_facts(client, project_id)

    # Build output structure
    output = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "github": {
            "personal": github_personal,
            "work": github_work,
        },
        "oura": {
            "averages": oura_stats["averages"],
            "totals": oura_stats["totals"],
            "monthly": oura_monthly,
            "correlation_data": correlation_data,
            "fun_facts": oura_fun_facts,
        },
    }

    # Write output
    output_path = Path(__file__).parent.parent / "src" / "data" / "year-in-review-2025.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    logger.info(f"Output written to {output_path}")
    return 0


def output_empty_structure():
    """Output empty structure when queries fail."""
    output = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "github": {
            "personal": {
                "total_prs": 0,
                "total_commits": 0,
                "repos": [],
                "fun_commits": [],
                "busiest_day": None,
            },
            "work": {
                "total_prs": 0,
                "total_commits": 0,
            },
        },
        "oura": {
            "averages": {
                "sleep_score": 0,
                "readiness_score": 0,
                "steps_daily": 0,
            },
            "totals": {
                "steps": 0,
                "active_calories": 0,
            },
            "monthly": [],
            "correlation_data": [],
            "fun_facts": {
                "best_sleep": None,
                "worst_sleep": None,
                "most_steps_day": None,
            },
        },
    }

    output_path = Path(__file__).parent.parent / "src" / "data" / "year-in-review-2025.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    logger.info(f"Empty structure written to {output_path}")


if __name__ == "__main__":
    sys.exit(main())
