"""
sk_connectors.py — Minimal Scalekit connector (Salesforce & Slack)

What it provides:
- get_connector(): singleton factory
- execute_action_with_retry(identifier, tool, parameters, max_attempts=None)
- is_service_connected(service, user_identifier)
- get_authorization_url(service, user_identifier)

Notes:
- Requires `scalekit` SDK and your `settings.Settings`.
- Only concerned with Salesforce + Slack for this project.
"""

from __future__ import annotations

import time
from typing import Any, Dict, Optional

from scalekit import ScalekitClient
from scalekit.core import ScalekitException

from settings import Settings


class ScalekitConnector:
    def __init__(self) -> None:
        if not Settings.SCALEKIT_CLIENT_ID or not Settings.SCALEKIT_CLIENT_SECRET:
            raise ValueError("Scalekit credentials not configured")

        self.client = ScalekitClient(
            env_url=Settings.SCALEKIT_ENV_URL,
            client_id=Settings.SCALEKIT_CLIENT_ID,
            client_secret=Settings.SCALEKIT_CLIENT_SECRET,
        )

        print(f"✅ Scalekit connector initialized for {Settings.SCALEKIT_ENV_URL}")

    # ------------------------------------------------------------------
    # Connections / OAuth
    # ------------------------------------------------------------------
    def _list_connected_accounts(self, identifier: str):
        try:
            resp = self.client.actions.list_connected_accounts(identifier=identifier)
            if hasattr(resp, "connected_accounts"):
                return resp.connected_accounts
            if hasattr(resp, "data"):
                return resp.data
            if isinstance(resp, list):
                return resp
            if isinstance(resp, dict):
                return resp.get("connected_accounts") or []
        except ScalekitException as e:
            print(f"❌ Error listing connections for {identifier}: {e}")
        return []

    def is_service_connected(self, service: str, user_identifier: str) -> bool:
        svc = service.upper()
        for c in self._list_connected_accounts(user_identifier):
            provider = getattr(c, "provider", None) if not isinstance(c, dict) else c.get("provider")
            status = getattr(c, "status", None) if not isinstance(c, dict) else c.get("status")
            if provider and str(provider).upper() == svc and status and str(status).upper() == "ACTIVE":
                print(f"✅ {service} connected for {user_identifier}")
                return True
        print(f"⚠️  {service} NOT connected for {user_identifier}")
        return False

    def _guess_connector_name(self, service: str, user_identifier: str) -> Optional[str]:
        # Prefer connector name from an existing connection (if any)
        for c in self._list_connected_accounts(user_identifier):
            provider = getattr(c, "provider", None) if not isinstance(c, dict) else c.get("provider")
            if provider and str(provider).upper() == service.upper():
                connector = getattr(c, "connector", None) if not isinstance(c, dict) else c.get("connector")
                if connector:
                    print(f"📌 Using connector '{connector}' for {service}")
                    return connector
        # Fallback defaults for this project
        defaults = {"slack": "slack", "salesforce": "salesforce"}
        guess = defaults.get(service.lower())
        if guess:
            print(f"ℹ️  Defaulting connector '{guess}' for {service}")
        return guess

    def get_authorization_url(self, service: str, user_identifier: str) -> str:
        try:
            connector_name = self._guess_connector_name(service, user_identifier)
            if not connector_name:
                raise RuntimeError(f"No connector available for service '{service}'")
            resp = self.client.actions.connected_accounts.get_magic_link_for_connected_account(
                connector=connector_name,
                identifier=user_identifier,
            )
            # Normalize link from different SDK shapes
            candidates = []
            if hasattr(resp, "link"): candidates.append(resp.link)
            if hasattr(resp, "magic_link"): candidates.append(resp.magic_link)
            if hasattr(resp, "authorization_link"): candidates.append(resp.authorization_link)
            if isinstance(resp, (list, tuple)) and resp:
                obj = resp[0]
                if hasattr(obj, "link"): candidates.append(obj.link)
                if hasattr(obj, "magic_link"): candidates.append(obj.magic_link)
                if hasattr(obj, "authorization_link"): candidates.append(obj.authorization_link)
            for url in candidates:
                if url:
                    print(f"🔗 OAuth link for {service}: {url}")
                    return url
            print(f"⚠️  Unexpected magic-link response for {service}: {resp}")
            return ""
        except Exception as e:
            print(f"❌ Error generating OAuth link for {service}/{user_identifier}: {e}")
            return ""

    # ------------------------------------------------------------------
    # Tool execution (with small retry/backoff)
    # ------------------------------------------------------------------
    def execute_action_with_retry(
        self,
        identifier: str,
        tool: str,
        parameters: Dict[str, Any],
        max_attempts: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        attempts = max(1, max_attempts or getattr(Settings, "RETRY_ATTEMPTS", 3))
        backoff = max(1, getattr(Settings, "RETRY_BACKOFF_SECONDS", 1))

        for i in range(1, attempts + 1):
            try:
                print(f"🔄 Executing {tool} (attempt {i}/{attempts})")
                _params_preview = self._preview(parameters)
                print(f"   Parameters: {_params_preview}")

                resp = self.client.actions.execute_tool(
                    tool_input=parameters,
                    tool_name=tool,
                    identifier=identifier,
                )

                data = resp.data if hasattr(resp, "data") and isinstance(resp.data, dict) else resp
                print(f"✅ {tool} succeeded")
                return data if isinstance(data, dict) else {"result": str(data)}

            except ScalekitException as e:
                msg = str(e)
                retryable = any(k in msg.lower() for k in ["429", "rate", "timeout", "unavailable", "temporar", "connection"])
                if i < attempts and retryable:
                    print(f"⚠️  {tool} failed (attempt {i}): {msg}")
                    print(f"   Retrying in {backoff}s...")
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                print(f"❌ {tool} failed permanently: {msg}")
                return None
            except Exception as e:
                if i >= attempts:
                    print(f"❌ {tool} error: {e}")
                    return None
                print(f"⚠️  {tool} error: {e} — retrying in {backoff}s")
                time.sleep(backoff)
                backoff *= 2

        return None

    # ------------------------------------------------------------------
    # Logging sanitization
    # ------------------------------------------------------------------
    def _preview(self, params: Dict[str, Any]) -> Dict[str, Any]:
        safe = dict(params or {})
        for k in ("text", "body", "description"):
            if k in safe and isinstance(safe[k], str) and len(safe[k]) > 160:
                safe[k] = safe[k][:160] + "…"
        for k in ("token", "authorization", "auth", "secret", "password"):
            if k in safe:
                safe[k] = "***"
        return safe


# Singleton factory
_connector: Optional[ScalekitConnector] = None

def get_connector() -> ScalekitConnector:
    global _connector
    if _connector is None:
        _connector = ScalekitConnector()
    return _connector
