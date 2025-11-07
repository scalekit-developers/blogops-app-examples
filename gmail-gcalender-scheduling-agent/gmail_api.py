# gmail_api.py
from __future__ import annotations
from typing import Dict, List, Any

from sk_connectors import get_connector

connector = get_connector()


def _extract_messages(obj: Any) -> List[Dict]:
    """
    Normalize Scalekit/Gmail response shapes to a list of message dicts.
    Primary (your env): {"data": {"messages": [...] , "page_token": "..."}}
    Fallbacks included for safety.
    """
    if obj is None:
        return []

    # 1) Your primary shape
    if isinstance(obj, dict):
        data = obj.get("data")
        if isinstance(data, dict) and isinstance(data.get("messages"), list):
            return [m for m in data["messages"] if isinstance(m, dict)]

        # 2) Some envs put messages at top level
        if isinstance(obj.get("messages"), list):
            return [m for m in obj["messages"] if isinstance(m, dict)]

        # 3) Generic wrappers
        for wrap in ("result", "response"):
            inner = obj.get(wrap)
            if isinstance(inner, dict) and isinstance(inner.get("messages"), list):
                return [m for m in inner["messages"] if isinstance(m, dict)]
            if isinstance(inner, list):
                return [m for m in inner if isinstance(m, dict)]

        # 4) Single message dict
        if obj.get("id") or obj.get("messageId"):
            return [obj]

    # 5) Top-level list
    if isinstance(obj, list):
        return [m for m in obj if isinstance(m, dict)]

    return []


def fetch_emails(identifier: str, query: str, max_results: int = 50) -> List[Dict]:
    res = connector.execute_action_with_retry(
        identifier=identifier,
        tool="gmail_fetch_mails",
        parameters={"query": query, "maxResults": max_results}
    ) 
    return _extract_messages(res)

def get_message(identifier: str, message_id: str) -> Dict:
    res = connector.execute_action_with_retry(
        identifier=identifier,
        tool="gmail_get_message_by_id",
        parameters={  # 👈 use snake_case key
            "message_id": message_id,
            "format": "full"
        }
    )
    # Normalize common response shapes to the actual message dict
    if not isinstance(res, dict):
        return {}

    data = res.get("data") or res.get("result") or res.get("response") or res

    if isinstance(data, dict):
        # Some envs nest under "message"
        if isinstance(data.get("message"), dict):
            return data["message"]
        # Or return the dict if it looks like a Gmail message
        if data.get("id") or data.get("payload") or data.get("threadId"):
            return data

    return {}
