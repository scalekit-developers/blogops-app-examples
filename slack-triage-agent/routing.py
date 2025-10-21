"""
routing.py - LangGraph Workflow for Message Routing

This module implements the intelligent routing logic for Slack messages.
It analyzes incoming Slack messages and decides which action to take:
- Create GitHub issue (for bugs, errors, technical issues)
- Create Zendesk ticket (for support, help requests)
- Ignore (for general chat, off-topic messages)

The routing can use either:
1. Rule-based logic (keyword matching) - fast, no LLM required
2. LLM-based logic (optional) - more intelligent, requires OpenAI API
"""

from enum import Enum
from typing import Any, Dict, List, Optional, TypedDict

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

from actions import ActionResult, get_actions
from settings import Settings


class ActionType(Enum):
    """
    Enumeration of possible actions the agent can take.
    """
    GITHUB_ISSUE = "github_issue"
    ZENDESK_TICKET = "zendesk_ticket"
    IGNORE = "ignore"


class MessageState(TypedDict, total=False):
    """
    State object passed through the LangGraph workflow.

    Contains all context needed for routing decisions:
    - message: The Slack message text
    - user: Slack user ID
    - channel: Slack channel ID
    - thread_ts: Thread timestamp (for replies)
    - action: Decided action type (ActionType enum)
    - action_result: Result from action execution
    """
    message: str
    user: str
    channel: str
    thread_ts: Optional[str]
    action: ActionType
    action_result: ActionResult


class MessageRouter:
    """
    Routes incoming Slack messages to appropriate actions using LangGraph.

    The workflow consists of:
    1. Analyze: Determine which action to take
    2. Execute: Perform the action (create issue/ticket)
    3. Confirm: Post confirmation back to Slack
    """

    def __init__(self, use_llm: bool = False):
        """
        Initialize the router with optional LLM support.

        Args:
            use_llm: If True, use OpenAI for routing decisions.
                     If False, use rule-based keyword matching.
        """
        self.use_llm = use_llm and Settings.OPENAI_API_KEY
        self.actions = get_actions()

        # Initialize LLM if configured
        if self.use_llm:
            self.llm = ChatOpenAI(
                model=Settings.OPENAI_MODEL,
                api_key=Settings.OPENAI_API_KEY,
                temperature=0  # Deterministic for routing
            )
            print("✅ Router initialized with LLM-based routing")
        else:
            self.llm = None
            print("✅ Router initialized with rule-based routing")

        # Build the LangGraph workflow
        self.workflow = self._build_workflow()

    def _build_workflow(self) -> StateGraph:
        """
        Build the LangGraph state machine for message processing.

        Workflow:
        START -> analyze_message -> execute_action -> send_confirmation -> END

        Returns:
            Compiled StateGraph workflow
        """
        # Create the graph
        workflow = StateGraph(MessageState)

        # Add nodes (processing steps)
        workflow.add_node("analyze", self._analyze_message)
        workflow.add_node("execute", self._execute_action)
        workflow.add_node("confirm", self._send_confirmation)

        # Define edges (flow between steps)
        workflow.set_entry_point("analyze")
        workflow.add_edge("analyze", "execute")
        workflow.add_edge("execute", "confirm")
        workflow.add_edge("confirm", END)

        # Compile the workflow
        return workflow.compile()

    def _analyze_message(self, state: MessageState) -> MessageState:
        """
        Analyze the message and decide which action to take.

        This is the core routing logic. It examines the message content
        and determines whether to create a GitHub issue, Zendesk ticket,
        or ignore the message.

        Args:
            state: Current workflow state with message details

        Returns:
            Updated state with 'action' field set
        """
        message = state.get("message", "").lower()

        print(f"🔍 Analyzing message (len={len(message)}): {message[:100] if message else '(empty)'}...")
        print(f"   Debug - state keys: {list(state.keys())}")

        if self.use_llm:
            # Use LLM to intelligently classify the message
            action = self._analyze_with_llm(message)
        else:
            # Use rule-based keyword matching
            action = self._analyze_with_rules(message)

        state["action"] = action
        print(f"📍 Routing decision: {action.value}")

        return state

    def _analyze_with_rules(self, message: str) -> ActionType:
        """
        Analyze message using simple rule-based keyword matching.

        This is fast and doesn't require an LLM, but less intelligent.

        Rules:
        - If message contains GitHub keywords -> GITHUB_ISSUE
        - Else if message contains Zendesk keywords -> ZENDESK_TICKET
        - Else -> IGNORE

        Args:
            message: Message text (lowercased)

        Returns:
            ActionType enum value
        """
        # Check for GitHub keywords
        github_match = any(
            keyword.lower() in message
            for keyword in Settings.GITHUB_KEYWORDS
        )

        if github_match:
            return ActionType.GITHUB_ISSUE

        # Check for Zendesk keywords (not supported yet)
        zendesk_match = any(
            keyword.lower() in message
            for keyword in Settings.ZENDESK_KEYWORDS
        )

        if zendesk_match:
            return ActionType.ZENDESK_TICKET

        # No match - ignore
        return ActionType.IGNORE

    def _analyze_with_llm(self, message: str) -> ActionType:
        """
        Analyze message using LLM for intelligent classification.

        This provides more nuanced understanding but requires OpenAI API.

        Args:
            message: Message text

        Returns:
            ActionType enum value
        """
        # Create prompt for LLM
        prompt = f"""
You are a triage agent for a Slack workspace. Your job is to analyze messages
and decide what action to take.

Message: "{message}"

Classify this message into one of these categories:

1. GITHUB_ISSUE - Technical issues, bugs, errors, feature requests, code problems
2. ZENDESK_TICKET - Support requests, customer questions, billing, general help
3. IGNORE - General chat, greetings, off-topic, already resolved

Respond with ONLY the category name (GITHUB_ISSUE, ZENDESK_TICKET, or IGNORE).
"""

        try:
            # Query the LLM
            response = self.llm.invoke([HumanMessage(content=prompt)])
            classification = response.content.strip().upper()

            # Map response to ActionType
            if "GITHUB" in classification:
                return ActionType.GITHUB_ISSUE
            elif "ZENDESK" in classification:
                return ActionType.ZENDESK_TICKET
            else:
                return ActionType.IGNORE

        except Exception as e:
            print(f"⚠️  LLM classification failed: {e}")
            print("   Falling back to rule-based routing")
            return self._analyze_with_rules(message.lower())

    def _execute_action(self, state: MessageState) -> MessageState:
        """
        Execute the decided action (create issue/ticket or skip).

        Args:
            state: Workflow state with 'action' field set

        Returns:
            Updated state with 'action_result' field
        """
        action = state.get("action")
        message = state.get("message", "")
        user_id = state.get("user")

        print(f"⚙️  Executing action: {action.value if action else 'None'}")

        if not action or action == ActionType.IGNORE:
            # No action needed
            state["action_result"] = ActionResult(
                success=True,
                message="Message ignored (no action required)"
            )
            return state

        # Get user's Scalekit identifier
        from sk_connectors import get_connector
        connector = get_connector()
        user_identifier = connector.get_user_identifier(user_id)

        if not user_identifier:
            state["action_result"] = ActionResult(
                success=False,
                message="User not mapped to Scalekit account",
                error=f"No mapping found for Slack user {user_id}"
            )
            return state

        # Extract title/subject from message (first line or sentence)
        title = self._extract_title(message)

        # Execute the appropriate action
        if action == ActionType.GITHUB_ISSUE:
            result = self.actions.create_github_issue(
                user_identifier=user_identifier,
                title=title,
                body=message,
                labels=["slack-triage", "automated"]
            )

        elif action == ActionType.ZENDESK_TICKET:
            result = self.actions.create_zendesk_ticket(
                user_identifier=user_identifier,
                subject=title,
                description=message,
                priority="normal",
                tags=["slack-triage", "automated"]
            )

        else:
            result = ActionResult(
                success=False,
                message="Unknown action type",
                error=f"Invalid action: {action}"
            )

        state["action_result"] = result
        return state

    def _send_confirmation(self, state: MessageState) -> MessageState:
        """
        Send a confirmation message back to the Slack channel.

        Args:
            state: Workflow state with 'action_result' field

        Returns:
            Final state
        """
        action_result = state.get("action_result")

        # Only send confirmation for successful actions (not for IGNORE)
        if not action_result or state.get("action") == ActionType.IGNORE:
            print("ℹ️  Skipping confirmation (no action taken)")
            return state

        # Get user's Scalekit identifier
        from sk_connectors import get_connector
        connector = get_connector()
        user_id = state.get("user")
        user_identifier = connector.get_user_identifier(user_id)

        if not user_identifier:
            print("⚠️  Cannot send confirmation - user not mapped")
            return state

        # Format confirmation message
        message = state.get("message", "")
        confirmation_text = self.actions.format_confirmation_message(
            action_result, message
        )

        # Send to Slack
        channel_id = state.get("channel")
        thread_ts = state.get("thread_ts")

        confirmation_result = self.actions.send_slack_message(
            user_identifier=user_identifier,
            channel_id=channel_id,
            text=confirmation_text,
            thread_ts=thread_ts
        )

        if confirmation_result.success:
            print("✅ Confirmation sent to Slack")
        else:
            print(f"⚠️  Failed to send confirmation: {confirmation_result.error}")

        return state

    def _extract_title(self, message: str, max_length: int = 80) -> str:
        """
        Extract a short title from a message.

        Takes the first line or sentence, truncated to max_length.

        Args:
            message: Full message text
            max_length: Maximum title length

        Returns:
            Extracted title
        """
        # Split by newline or period
        lines = message.split('\n')
        first_line = lines[0].strip()

        # If first line is too long, find first sentence
        if len(first_line) > max_length:
            sentences = first_line.split('. ')
            first_line = sentences[0]

        # Truncate if still too long
        if len(first_line) > max_length:
            first_line = first_line[:max_length - 3] + "..."

        return first_line

    def route_message(
        self,
        message: str,
        user_id: str,
        channel_id: str,
        thread_ts: Optional[str] = None
    ) -> ActionResult:
        """
        Main entry point: route a Slack message through the workflow.

        This orchestrates the entire process:
        1. Analyze the message
        2. Execute the decided action
        3. Send confirmation

        Args:
            message: Slack message text
            user_id: Slack user ID who sent the message
            channel_id: Slack channel ID where message was sent
            thread_ts: Optional thread timestamp

        Returns:
            ActionResult from the executed action
        """
        print(f"\n{'='*60}")
        print(f"🚀 Starting message routing workflow")
        print(f"   User: {user_id}")
        print(f"   Channel: {channel_id}")
        print(f"{'='*60}\n")

        # Initialize state
        initial_state: MessageState = {
            "message": message,
            "user": user_id,
            "channel": channel_id,
            "thread_ts": thread_ts,
        }

        # Run the workflow
        try:
            final_state = self.workflow.invoke(initial_state)
            result = final_state.get("action_result")

            print(f"\n{'='*60}")
            print(f"✅ Workflow completed: {result}")
            print(f"{'='*60}\n")

            return result

        except Exception as e:
            print(f"\n{'='*60}")
            print(f"❌ Workflow failed: {e}")
            print(f"{'='*60}\n")

            return ActionResult(
                success=False,
                message="Workflow execution failed",
                error=str(e)
            )


# Global router instance
_router: Optional[MessageRouter] = None


def get_router(use_llm: bool = False) -> MessageRouter:
    """
    Get or create the global MessageRouter instance.

    Args:
        use_llm: Whether to use LLM-based routing

    Returns:
        MessageRouter instance
    """
    global _router
    if _router is None:
        _router = MessageRouter(use_llm=use_llm)
    return _router
