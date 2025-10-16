"""
sk_connectors.py - Scalekit Integration Layer

This module manages all interactions with Scalekit, including:
- OAuth flow management for connecting user accounts
- Retrieving connected account information
- Executing actions (tools) via Scalekit's unified API
- User identifier mapping and storage

All third-party API calls (Slack, GitHub, Zendesk) MUST go through
Scalekit's connector layer to ensure proper OAuth handling and security.
"""

import json
import time
from pathlib import Path
from typing import Any, Dict, Optional

from scalekit import ScalekitClient
from scalekit.core import ScalekitException

from settings import Settings


class ScalekitConnector:
    """
    Manages Scalekit connections and authentication for all services.

    This class provides a unified interface for:
    1. Initializing Scalekit client
    2. Managing user-to-account mappings
    3. Checking connection status
    4. Executing actions with retry logic
    """

    def __init__(self):
        """
        Initialize the Scalekit client with credentials from settings.

        Raises:
            ValueError: If Scalekit credentials are not configured
        """
        if not Settings.SCALEKIT_CLIENT_ID or not Settings.SCALEKIT_CLIENT_SECRET:
            raise ValueError("Scalekit credentials not configured")

        # Initialize Scalekit client
        # This client will handle OAuth flows and API calls to all connected services
        self.client = ScalekitClient(
            env_url=Settings.SCALEKIT_ENV_URL,
            client_id=Settings.SCALEKIT_CLIENT_ID,
            client_secret=Settings.SCALEKIT_CLIENT_SECRET
        )

        # Load user mappings from file
        # Maps Slack user IDs to Scalekit identifiers (email, user ID, etc.)
        self.user_mappings = self._load_user_mappings()

        print(f"✅ Scalekit connector initialized for {Settings.SCALEKIT_ENV_URL}")

    def _load_user_mappings(self) -> Dict[str, Dict[str, str]]:
        """
        Load user-to-account mappings from JSON file.

        Expected format:
        {
            "U01234567": {
                "scalekit_identifier": "user@example.com",
                "github_username": "username",
                "zendesk_email": "user@example.com"
            }
        }

        Returns:
            Dictionary mapping Slack user IDs to account information
        """
        mapping_file = Path(Settings.USER_MAPPING_FILE)

        if not mapping_file.exists():
            print(f"⚠️  User mapping file not found: {Settings.USER_MAPPING_FILE}")
            print("   Creating empty mapping file...")
            mapping_file.write_text(json.dumps({}, indent=2))
            return {}

        try:
            with open(mapping_file, 'r') as f:
                mappings = json.load(f)
                print(f"📋 Loaded {len(mappings)} user mappings")
                return mappings
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing user mapping file: {e}")
            return {}

    def get_user_identifier(self, slack_user_id: str) -> Optional[str]:
        """
        Get the Scalekit identifier for a Slack user.

        This identifier is used to look up connected accounts in Scalekit.
        It could be an email, user ID, or any unique identifier.

        Args:
            slack_user_id: Slack user ID (e.g., "U01234567")

        Returns:
            Scalekit identifier if found, None otherwise
        """
        user_info = self.user_mappings.get(slack_user_id)
        if not user_info:
            print(f"⚠️  No mapping found for Slack user {slack_user_id}")
            return None

        return user_info.get("scalekit_identifier")

    def get_connected_account(self, service: str, user_identifier: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a connected account for a specific service.

        This checks if the user has authorized the given service (GitHub, Zendesk, Slack)
        through Scalekit's OAuth flow.

        Args:
            service: Service name ("github", "zendesk", "slack")
            user_identifier: User's Scalekit identifier

        Returns:
            Connected account info if found and valid, None otherwise
        """
        try:
            # Query Scalekit for connected accounts via Actions API
            # This returns all services the user has authorized
            response = self.client.actions.list_connected_accounts(identifier=user_identifier)

            # Extract connected accounts from the response object
            # The response is a ListConnectedAccountsResponse with a connected_accounts attribute
            if hasattr(response, 'connected_accounts'):
                connections_data = response.connected_accounts
            elif hasattr(response, 'data'):
                connections_data = response.data
            elif isinstance(response, list):
                connections_data = response
            elif isinstance(response, dict):
                connections_data = response.get('connected_accounts', [])
            else:
                print(f"⚠️  Unexpected response type: {type(response)}")
                print(f"   Available attributes: {dir(response)}")
                return None

            # Find the specific service connection
            # Connections are Pydantic models, not dicts - access attributes directly
            for connection in connections_data:
                # Check if it's a dict or Pydantic model
                if isinstance(connection, dict):
                    provider = connection.get("provider")
                    status = connection.get("status")
                else:
                    provider = getattr(connection, "provider", None)
                    status = getattr(connection, "status", None)

                # Case-insensitive comparison (API returns "GITHUB", we search for "github")
                if provider and provider.upper() == service.upper() and status and status.upper() == "ACTIVE":
                    print(f"✅ Found active {service} connection for {user_identifier}")
                    return connection

            print(f"⚠️  No active {service} connection for {user_identifier}")
            print(f"   User needs to authorize via OAuth flow")
            return None

        except ScalekitException as e:
            print(f"❌ Error fetching connected account: {e}")
            return None

    def is_service_connected(self, service: str, user_identifier: str) -> bool:
        """
        Check if a user has connected a specific service.

        Args:
            service: Service name ("github", "zendesk", "slack")
            user_identifier: User's Scalekit identifier

        Returns:
            True if service is connected and active, False otherwise
        """
        return self.get_connected_account(service, user_identifier) is not None

    def execute_action_with_retry(
        self,
        identifier: str,
        tool: str,
        parameters: Dict[str, Any],
        max_attempts: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Execute a Scalekit action (tool) with exponential backoff retry logic.

        This is the core method for triggering any third-party action:
        - github_issue_create
        - zendesk_create_ticket
        - slack_send_message

        Retry logic handles:
        - Transient network errors
        - Rate limiting (429 errors)
        - Temporary service unavailability

        Args:
            identifier: User's Scalekit identifier
            tool: Tool name (e.g., "github_issue_create")
            parameters: Tool-specific parameters
            max_attempts: Maximum retry attempts (defaults to Settings.RETRY_ATTEMPTS)

        Returns:
            Action result on success, None on failure
        """
        if max_attempts is None:
            max_attempts = Settings.RETRY_ATTEMPTS

        backoff = Settings.RETRY_BACKOFF_SECONDS

        for attempt in range(1, max_attempts + 1):
            try:
                print(f"🔄 Executing {tool} (attempt {attempt}/{max_attempts})")
                print(f"   Parameters: {self._sanitize_params(parameters)}")

                # Execute the action via Scalekit's unified API
                # Scalekit handles OAuth, API calls, and response parsing
                response = self.client.actions.execute_tool(
                    tool_input=parameters,
                    tool_name=tool,
                    identifier=identifier
                )

                print(f"✅ Action {tool} succeeded")
                # Return the data dict from the ExecuteToolResponse
                return response.data if hasattr(response, 'data') else response

            except ScalekitException as e:
                error_msg = str(e)

                # Check if this is a rate limit error (retry makes sense)
                is_rate_limit = "429" in error_msg or "rate limit" in error_msg.lower()

                # Check if this is a transient error (retry makes sense)
                is_transient = any(err in error_msg.lower() for err in [
                    "timeout", "connection", "temporary", "unavailable"
                ])

                should_retry = (is_rate_limit or is_transient) and attempt < max_attempts

                if should_retry:
                    print(f"⚠️  {tool} failed (attempt {attempt}): {error_msg}")
                    print(f"   Retrying in {backoff}s...")
                    time.sleep(backoff)
                    backoff *= 2  # Exponential backoff
                else:
                    print(f"❌ {tool} failed permanently: {error_msg}")
                    return None

        print(f"❌ {tool} failed after {max_attempts} attempts")
        return None

    def _sanitize_params(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize parameters for safe logging (hide sensitive data).

        Args:
            parameters: Raw parameters dictionary

        Returns:
            Sanitized parameters safe for logging
        """
        # Create a copy to avoid modifying original
        sanitized = parameters.copy()

        # Truncate long text fields for readability
        if "body" in sanitized and len(sanitized["body"]) > 100:
            sanitized["body"] = sanitized["body"][:100] + "..."

        if "description" in sanitized and len(sanitized["description"]) > 100:
            sanitized["description"] = sanitized["description"][:100] + "..."

        return sanitized

    def get_authorization_url(self, service: str, user_identifier: str, redirect_uri: str = None) -> str:
        """
        Generate OAuth authorization URL for a service using Scalekit SDK.
        Tries to find the connector name for the service, even if the user has no connected accounts yet.
        """
        try:
            connector_name = None
            # Try to get connector name from existing connections
            try:
                connections_response = self.client.actions.list_connected_accounts(identifier=user_identifier)
                if hasattr(connections_response, 'connected_accounts'):
                    for account in connections_response.connected_accounts:
                        provider = getattr(account, 'provider', None)
                        if provider and provider.upper() == service.upper():
                            connector_name = getattr(account, 'connector', None)
                            print(f"📌 Found connector name for {service}: {connector_name}")
                            break
            except Exception as e:
                print(f"⚠️  Could not get connector name from connected accounts: {e}")

            # If not found, try to derive connector name from config or catalog
            if not connector_name:
                # Try to use a default mapping from Settings or a static map
                default_connectors = {
                    'slack': 'slack',
                    'github': 'github',
                }
                connector_name = default_connectors.get(service.lower())
                print(f"ℹ️  Using default connector name for {service}: {connector_name}")
                # Optionally: TODO - fetch connector catalog from Scalekit if available

            if not connector_name:
                raise Exception(f"No connector found for service {service}. Please create the connection in Scalekit dashboard first.")

            link_response = self.client.actions.connected_accounts.get_magic_link_for_connected_account(
                connector=connector_name,
                identifier=user_identifier
            )

            if isinstance(link_response, tuple):
                link_data, _ = link_response
            else:
                link_data = link_response

            if hasattr(link_data, 'link'):
                auth_url = link_data.link
            elif hasattr(link_data, 'magic_link'):
                auth_url = link_data.magic_link
            elif hasattr(link_data, 'authorization_link'):
                auth_url = link_data.authorization_link
            else:
                print(f"⚠️  Unexpected response structure: {link_data}")
                auth_url = str(link_data)

            print(f"🔗 Generated magic link for {service}: {auth_url}")
            return auth_url

        except Exception as e:
            print(f"❌ Error generating auth URL: {e}")
            import traceback
            traceback.print_exc()
            return ""
# Global connector instance
# Initialized once and reused across the application
_connector: Optional[ScalekitConnector] = None


def get_connector() -> ScalekitConnector:
    """
    Get or create the global Scalekit connector instance.

    This ensures we only initialize one client and reuse it.

    Returns:
        ScalekitConnector instance
    """
    global _connector
    if _connector is None:
        _connector = ScalekitConnector()
    return _connector
