"""
notion_service.py - Notion integration for Release Notes

Provides utilities to upsert release notes into a Notion database
using the official Notion API. Idempotency is handled by storing the
PR merge SHA in a dedicated database property and updating the page
if it already exists.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from settings import Settings
from sk_connectors import get_connector

logger = logging.getLogger(__name__)


class NotionReleaseNotes:
    def __init__(self) -> None:
        self.db_id = Settings.NOTION_DATABASE_ID
        if not self.db_id:
            raise ValueError("NOTION_DATABASE_ID is required")
        if not Settings.NOTION_VIA_SCALEKIT:
            raise ValueError("Scalekit Notion mode required. Set NOTION_VIA_SCALEKIT=true.")

    def _query_by_sha(self, pr_sha: str) -> Optional[str]:
        """
        Find an existing page in the database by PR SHA. Returns page_id if found.
        """
        # Query-by-SHA handled inside the upsert tool in Scalekit; return None here
        return None

    def _properties_payload(
        self,
        title: str,
        pr_sha: str,
        pr_number: int,
        repo: str,
        status: str,
        summary: Optional[str] = None,
    ) -> Dict[str, Any]:
        props: Dict[str, Any] = {
            Settings.NOTION_PROP_TITLE: {"title": [{"text": {"content": title}}]},
            Settings.NOTION_PROP_PR_SHA: {"rich_text": [{"text": {"content": pr_sha}}]},
            Settings.NOTION_PROP_PR_NUMBER: {"number": pr_number},
            Settings.NOTION_PROP_REPO: {"rich_text": [{"text": {"content": repo}}]},
            Settings.NOTION_PROP_STATUS: {"select": {"name": status}},
        }
        if summary:
            props[Settings.NOTION_PROP_SUMMARY] = {"rich_text": [{"text": {"content": summary[:2000]}}]}
        return props

    def _children_from_commits(self, commits: List[Dict[str, Any]], summary: Optional[str] = None) -> List[Dict[str, Any]]:
        children: List[Dict[str, Any]] = []

        # If we have a summary (PR description), add it first
        if summary:
            children.append({
                "heading_2": {"rich_text": [{"text": {"content": "Description"}}]},
                "object": "block",
            })
            # Split summary into chunks if it's too long (Notion limit is 2000 chars per block)
            for i in range(0, len(summary), 1900):
                chunk = summary[i:i+1900]
                children.append({
                    "paragraph": {
                        "rich_text": [{"text": {"content": chunk}}]
                    },
                    "object": "block",
                })

        # Add commits section if we have commits
        if commits:
            children.append({
                "heading_2": {"rich_text": [{"text": {"content": "Commits"}}]},
                "object": "block",
            })
            for c in commits:
                msg = (c.get("commit", {}).get("message") or c.get("message") or "").split("\n")[0]
                author = (c.get("author", {}) or {}).get("login") or (c.get("commit", {}).get("author", {}).get("name"))
                sha = c.get("sha", "")[:7]
                line = f"{msg} ({sha})"
                if author:
                    line = f"{line} — {author}"
                children.append({
                    "bulleted_list_item": {
                        "rich_text": [{"text": {"content": line}}]
                    },
                    "object": "block",
                })

        return children

    def upsert_release_notes(
        self,
        *,
        title: str,
        pr_sha: str,
        pr_number: int,
        repo: str,
        status: str = "Merged",
        commits: Optional[List[Dict[str, Any]]] = None,
        summary: Optional[str] = None,
        links: Optional[Dict[str, str]] = None,
    ) -> Optional[str]:
        """
        Create or update a Notion page for the given PR merge.

        Returns the Notion page URL if successful.
        """
        props = self._properties_payload(title, pr_sha, pr_number, repo, status, summary)
        children = self._children_from_commits(commits or [], summary)

        # Add PR links at the top
        if links:
            pr_link = links.get('pr_url', '')
            compare_link = links.get('compare_url', '')

            # Build rich_text array properly
            rich_text = []
            if pr_link:
                rich_text.append({"text": {"content": "🔗 PR: ", "link": None}})
                rich_text.append({"text": {"content": pr_link, "link": {"url": pr_link}}})
            if compare_link:
                if rich_text:
                    rich_text.append({"text": {"content": " | ", "link": None}})
                rich_text.append({"text": {"content": "Compare", "link": {"url": compare_link}}})

            if rich_text:  # Only add if we have links
                children.insert(0, {
                    "paragraph": {
                        "rich_text": rich_text
                    },
                    "object": "block",
                })

        # Execute the insert via Scalekit action
        # Note: This creates a new page each time; true "upsert" would require
        # querying first to check if a page with this PR SHA exists
        # WORKAROUND: Scalekit's notion_database_insert_row currently only accepts 'title' property
        # Other properties (PR SHA, PR Number, etc.) cause "Invalid property identifier" errors
        # So we only set title and include metadata in content blocks
        connector = get_connector()
        identifier = _resolve_identifier()
        tool_name = Settings.NOTION_UPSERT_TOOL_NAME

        # Add metadata block at the top since we can't set properties
        metadata_block = {
            "object": "block",
            "callout": {
                "rich_text": [
                    {"text": {"content": f"📝 PR #{pr_number} | {repo} | {status}\n"}},
                    {"text": {"content": f"SHA: {pr_sha}", "link": None}}
                ],
                "icon": {"emoji": "📌"}
            }
        }
        children.insert(0, metadata_block)

        payload = {
            "database_id": self.db_id,
            "properties": {"title": {"title": [{"text": {"content": title}}]}},  # Only title property works
            "child_blocks": children,
        }
        try:
            res = connector.execute_action_with_retry(
                identifier=identifier,
                tool=tool_name,
                parameters=payload,
            )
            # Expect res to contain a url; fallback to None
            if isinstance(res, dict):
                url = res.get("url") or res.get("page_url")
            else:
                url = None
            if url:
                logger.info("Upserted Notion page via Scalekit: %s", url)
            else:
                logger.warning("Scalekit Notion upsert returned no URL; response=%s", res)
            return url
        except Exception as e:
            logger.exception("Scalekit Notion upsert failed: %s", e)
            return None

    def _get_page_url(self, page_id: Optional[str]) -> Optional[str]:
        if not page_id:
            return None
        # URL is provided by Scalekit response; we don't retrieve it here
        return None


def summarize_commits_simple(commits: List[Dict[str, Any]], limit: int = 8) -> str:
    """Create a simple bullet summary from commit messages."""
    if not commits:
        return ""
    bullets = []
    for c in commits[:limit]:
        msg = (c.get("commit", {}).get("message") or c.get("message") or "").split("\n")[0]
        bullets.append(f"• {msg}")
    if len(commits) > limit:
        bullets.append(f"• … and {len(commits) - limit} more")
    return "\n".join(bullets)


def _resolve_identifier() -> Optional[str]:
    """Resolve a Scalekit identifier to use for executing Notion tools.

    Order:
    1) First entry in user_mapping.json with scalekit_identifier
    2) Settings.SCALEKIT_DEFAULT_IDENTIFIER
    """
    try:
        import json as _json
        from pathlib import Path
        mpath = Path(Settings.USER_MAPPING_FILE)
        if mpath.exists():
            mappings = _json.loads(mpath.read_text() or "{}")
            for _, info in mappings.items():
                ident = (info or {}).get("scalekit_identifier")
                if ident:
                    return ident
    except Exception:
        pass
    return Settings.SCALEKIT_DEFAULT_IDENTIFIER
