"""
actions.py - Tool Execution Layer

This module defines all available actions (tools) that the agent can execute:
- GitHub: Create issues
- Zendesk: Create support tickets
- Slack: Send confirmation messages

All actions use Scalekit's connector layer for execution, ensuring
proper OAuth handling and unified API interface.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from settings import Settings
from sk_connectors import get_connector


class ActionResult:
    """
    Represents the result of an action execution.

    Attributes:
        success: Whether the action succeeded
        message: Human-readable result message
        data: Raw result data from the action
        error: Error message if action failed
    """

    def __init__(self, success: bool, message: str, data: Optional[Dict] = None, error: Optional[str] = None):
        self.success = success
        self.message = message
        self.data = data or {}
        self.error = error

    def __repr__(self) -> str:
        status = "✅" if self.success else "❌"
        return f"{status} {self.message}"


class Actions:
    """
    High-level interface for executing agent actions.

    Each method corresponds to one type of action the agent can take.
    All methods return ActionResult for consistent handling.
    """

    def __init__(self):
        """Initialize the actions handler with Scalekit connector."""
        self.connector = get_connector()

    # ============================================================================
    # GITHUB ACTIONS
    # ============================================================================

    def create_github_issue(
        self,
        user_identifier: str,
        title: str,
        body: str,
        repo_owner: Optional[str] = None,
        repo_name: Optional[str] = None,
        labels: Optional[list] = None
    ) -> ActionResult:
        """
        Create a GitHub issue using Scalekit's GitHub connector.

        This action:
        1. Verifies the user has a connected GitHub account
        2. Calls Scalekit's github_issue_create tool
        3. Returns issue URL and number

        Args:
            user_identifier: User's Scalekit identifier
            title: Issue title (brief summary)
            body: Issue description (can include markdown)
            repo_owner: GitHub repo owner (defaults to Settings.GITHUB_REPO_OWNER)
            repo_name: GitHub repo name (defaults to Settings.GITHUB_REPO_NAME)
            labels: Optional list of label names to apply

        Returns:
            ActionResult with issue details or error
        """
        # Use default repo if not specified
        repo_owner = repo_owner or Settings.GITHUB_REPO_OWNER
        repo_name = repo_name or Settings.GITHUB_REPO_NAME

        if not repo_owner or not repo_name:
            return ActionResult(
                success=False,
                message="GitHub repository not configured",
                error="GITHUB_REPO_OWNER and GITHUB_REPO_NAME must be set"
            )

        # Check if user has GitHub connected
        if not self.connector.is_service_connected("github", user_identifier):
            return ActionResult(
                success=False,
                message="GitHub not connected for this user",
                error="User needs to authorize GitHub via OAuth"
            )

        # Prepare parameters for Scalekit action
        # These match the github_issue_create tool schema
        parameters = {
            "owner": repo_owner,
            "repo": repo_name,
            "title": title,
            "body": body,
        }

        # Add labels if provided
        if labels:
            parameters["labels"] = labels

        # Execute action with retry logic
        result = self.connector.execute_action_with_retry(
            identifier=user_identifier,
            tool="github_issue_create",
            parameters=parameters
        )

        if result:
            # Extract issue details from response
            issue_number = result.get("number", "unknown")
            issue_url = result.get("html_url", "")

            return ActionResult(
                success=True,
                message=f"GitHub issue #{issue_number} created",
                data={
                    "issue_number": issue_number,
                    "issue_url": issue_url,
                    "repository": f"{repo_owner}/{repo_name}"
                }
            )
        else:
            return ActionResult(
                success=False,
                message="Failed to create GitHub issue",
                error="Scalekit action execution failed"
            )

    # ============================================================================
    # ZENDESK ACTIONS
    # ============================================================================

    def create_zendesk_ticket(
        self,
        user_identifier: str,
        subject: str,
        description: str,
        priority: str = "normal",
        ticket_type: str = "question",
        tags: Optional[list] = None
    ) -> ActionResult:
        """Create a Zendesk support ticket. (Not supported - Scalekit doesn't have Zendesk yet)"""
        return ActionResult(
            success=False,
            message="Zendesk integration not available",
            error="Zendesk is not currently supported by Scalekit"
        )

    # ============================================================================
    # SLACK ACTIONS
    # ============================================================================

    def send_slack_message(
        self,
        user_identifier: str,
        channel_id: str,
        text: str,
        thread_ts: Optional[str] = None
    ) -> ActionResult:
        """
        Send a message to a Slack channel using Scalekit's Slack connector.

        This is typically used to post confirmation messages after actions.

        Args:
            user_identifier: User's Scalekit identifier
            channel_id: Slack channel ID (e.g., "C01234567")
            text: Message text (supports Slack markdown)
            thread_ts: Optional thread timestamp to reply in thread

        Returns:
            ActionResult with message details or error
        """
        # Check if user has Slack connected
        # Note: The bot itself likely has Slack access, but we use Scalekit
        # for consistency and to respect user-level permissions
        if not self.connector.is_service_connected("slack", user_identifier):
            return ActionResult(
                success=False,
                message="Slack not connected for this user",
                error="User needs to authorize Slack via OAuth"
            )

        # Prepare parameters for Scalekit action
        parameters = {
            "channel": channel_id,
            "text": text,
        }

        # Add thread_ts if replying in thread
        if thread_ts:
            parameters["thread_ts"] = thread_ts

        # Execute action with retry logic
        result = self.connector.execute_action_with_retry(
            identifier=user_identifier,
            tool="slack_send_message",
            parameters=parameters
        )

        if result:
            return ActionResult(
                success=True,
                message="Slack message sent",
                data={
                    "channel": channel_id,
                    "timestamp": result.get("ts", "")
                }
            )
        else:
            return ActionResult(
                success=False,
                message="Failed to send Slack message",
                error="Scalekit action execution failed"
            )

    # ============================================================================
    # HELPER METHODS
    # ============================================================================

    def format_confirmation_message(self, action_result: ActionResult, original_message: str) -> str:
        """
        Format a confirmation message for posting back to Slack.

        Args:
            action_result: Result from an action execution
            original_message: The original Slack message that triggered the action

        Returns:
            Formatted confirmation message with emojis and links
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if not action_result.success:
            return f"❌ *Action Failed*\n```{action_result.error}```"

        # Format based on action type
        data = action_result.data

        if "issue_number" in data:
            # GitHub issue created
            return (
                f"✅ *GitHub Issue Created*\n"
                f"📋 Issue: #{data['issue_number']}\n"
                f"🔗 URL: {data['issue_url']}\n"
                f"📂 Repository: `{data['repository']}`\n"
                f"_Triggered by: {original_message[:100]}_"
            )

        elif "ticket_id" in data:
            # Zendesk ticket created
            return (
                f"✅ *Zendesk Ticket Created*\n"
                f"🎫 Ticket: #{data['ticket_id']}\n"
                f"🔗 URL: {data['ticket_url']}\n"
                f"⚡ Priority: `{data['priority']}`\n"
                f"_Triggered by: {original_message[:100]}_"
            )

        else:
            # Generic success
            return f"✅ {action_result.message}\n_Time: {timestamp}_"


# Global actions instance
# Initialized once and reused across the application
_actions: Optional[Actions] = None


def get_actions() -> Actions:
    """
    Get or create the global Actions instance.

    Returns:
        Actions instance
    """
    global _actions
    if _actions is None:
        _actions = Actions()
    return _actions
