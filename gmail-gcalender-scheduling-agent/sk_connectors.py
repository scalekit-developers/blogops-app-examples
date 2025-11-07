# sk_connectors.py — Scalekit Integration Layer (single-user, no Slack mapping)

import os
import time
from typing import Any, Dict, Optional

from scalekit import ScalekitClient
from scalekit.core import ScalekitException

from settings import Settings


class ScalekitConnector:
    """
    Manages Scalekit connections and authentication for all services.

    Single-user mode:
    - Reads the Scalekit identifier from .env (SCALEKIT_IDENTIFIER).
    - No Slack/GitHub/Zendesk user mapping required.
    """

    def __init__(self):
        if not Settings.SCALEKIT_CLIENT_ID or not Settings.SCALEKIT_CLIENT_SECRET:
            raise ValueError("Scalekit credentials not configured")

        self.client = ScalekitClient(
            env_url=Settings.SCALEKIT_ENV_URL,
            client_id=Settings.SCALEKIT_CLIENT_ID,
            client_secret=Settings.SCALEKIT_CLIENT_SECRET,
        )
        print(f"✅ Scalekit connector initialized for {Settings.SCALEKIT_ENV_URL}")

    # -------------------------------------------------------------------------
    # Identifier (single-user)
    # -------------------------------------------------------------------------
    def get_user_identifier(self) -> Optional[str]:
        """
        Return the Scalekit identifier for this automation (single-user mode).
        Reads SCALEKIT_IDENTIFIER from .env.
        """
        env_id = os.getenv("SCALEKIT_IDENTIFIER")
        if env_id:
            return env_id

        print(
            "⚠️ No identifier found. Set SCALEKIT_IDENTIFIER in .env "
            "or pass an explicit 'identifier' to your service endpoints."
        )
        return None

    # -------------------------------------------------------------------------
    # Connections
    # -------------------------------------------------------------------------
    def get_connected_account(self, service: str, user_identifier: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a connected account for a specific service (e.g., gmail, googlecalendar).
        """
        try:
            response = self.client.actions.list_connected_accounts(identifier=user_identifier)

            # Normalize to iterable of connection objects/dicts
            if hasattr(response, "connected_accounts"):
                connections = response.connected_accounts
            elif hasattr(response, "data"):
                connections = response.data
            elif isinstance(response, list):
                connections = response
            elif isinstance(response, dict):
                connections = response.get("connected_accounts", [])
            else:
                print(f"⚠️ Unexpected response type from list_connected_accounts: {type(response)}")
                return None

            for conn in connections:
                if isinstance(conn, dict):
                    provider = conn.get("provider")
                    status = conn.get("status")
                else:
                    provider = getattr(conn, "provider", None)
                    status = getattr(conn, "status", None)

                if provider and provider.upper() == service.upper() and status and status.upper() == "ACTIVE":
                    print(f"✅ Found active {service} connection for {user_identifier}")
                    return conn

            print(f"⚠️ No active {service} connection for {user_identifier}. Authorize via OAuth first.")
            return None

        except ScalekitException as e:
            print(f"❌ Error fetching connected account: {e}")
            return None

    def is_service_connected(self, service: str, user_identifier: str) -> bool:
        return self.get_connected_account(service, user_identifier) is not None

    # -------------------------------------------------------------------------
    # Tool execution with retries
    # -------------------------------------------------------------------------
    def execute_action_with_retry(
        self,
        identifier: str,
        tool: str,
        parameters: Dict[str, Any],
        max_attempts: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Execute a Scalekit tool with exponential backoff retry logic.
        """
        if max_attempts is None:
            max_attempts = Settings.RETRY_ATTEMPTS
        backoff = Settings.RETRY_BACKOFF_SECONDS

        for attempt in range(1, max_attempts + 1):
            try:
                print(f"🔄 Executing {tool} (attempt {attempt}/{max_attempts})")
                print(f"   Parameters: {self._sanitize_params(parameters)}")

                response = self.client.actions.execute_tool(
                    tool_input=parameters, tool_name=tool, identifier=identifier
                )

                print(f"✅ Action {tool} succeeded")
                return response.data if hasattr(response, "data") else response

            except ScalekitException as e:
                error_msg = str(e).lower()
                is_rate_limit = "429" in error_msg or "rate limit" in error_msg
                is_transient = any(s in error_msg for s in ["timeout", "connection", "temporary", "unavailable"])
                should_retry = (is_rate_limit or is_transient) and attempt < max_attempts

                if should_retry:
                    print(f"⚠️  {tool} failed (attempt {attempt}): {e}")
                    print(f"   Retrying in {backoff}s...")
                    time.sleep(backoff)
                    backoff *= 2
                else:
                    print(f"❌ {tool} failed permanently: {e}")
                    return None

        print(f"❌ {tool} failed after {max_attempts} attempts")
        return None

    def _sanitize_params(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        sanitized = dict(parameters)
        if "body" in sanitized and isinstance(sanitized["body"], str) and len(sanitized["body"]) > 100:
            sanitized["body"] = sanitized["body"][:100] + "..."
        if "description" in sanitized and isinstance(sanitized["description"], str) and len(sanitized["description"]) > 100:
            sanitized["description"] = sanitized["description"][:100] + "..."
        return sanitized

    # -------------------------------------------------------------------------
    # OAuth Magic Link
    # -------------------------------------------------------------------------
    def get_authorization_url(self, service: str, user_identifier: str, redirect_uri: str = None) -> str:
        """
        Generate an OAuth authorization (magic) link for a given service using Scalekit.
        """
        try:
            # Try to discover connector name from existing connections
            connector_name = None
            try:
                connections_response = self.client.actions.list_connected_accounts(identifier=user_identifier)
                if hasattr(connections_response, "connected_accounts"):
                    for account in connections_response.connected_accounts:
                        provider = getattr(account, "provider", None)
                        if provider and provider.upper() == service.upper():
                            connector_name = getattr(account, "connector", None)
                            print(f"📌 Found connector name for {service}: {connector_name}")
                            break
            except Exception as e:
                print(f"⚠️ Could not pre-fetch connector name: {e}")

            if not connector_name:
                raise Exception(
                    f"No connector found for service '{service}'. "
                    f"Create the connection in Scalekit dashboard first."
                )

            link_response = self.client.actions.connected_accounts.get_magic_link_for_connected_account(
                connector=connector_name,
                identifier=user_identifier,
            )

            # Response may be a tuple or object
            link_data = link_response[0] if isinstance(link_response, tuple) else link_response

            if hasattr(link_data, "link"):
                return link_data.link
            if hasattr(link_data, "magic_link"):
                return link_data.magic_link
            if hasattr(link_data, "authorization_link"):
                return link_data.authorization_link

            print(f"⚠️ Unexpected magic link response: {link_data}")
            return str(link_data)

        except Exception as e:
            print(f"❌ Error generating auth URL: {e}")
            return ""


# Global singleton
_connector: Optional[ScalekitConnector] = None

def get_connector() -> ScalekitConnector:
    global _connector
    if _connector is None:
        _connector = ScalekitConnector()
    return _connector
