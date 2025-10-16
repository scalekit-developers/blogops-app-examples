"""
main_polling.py - Scalekit-Native Slack Triage Agent (Polling Mode)

This module implements a pure Scalekit approach for monitoring Slack channels.
Instead of webhooks, it periodically polls Slack channels via Scalekit's API
to fetch new messages and process them.

Architecture:
1. Poll Slack channels via Scalekit's slack_fetch_conversation_history tool
2. Track processed messages to avoid duplicates
3. Process new messages through routing logic
4. Execute actions via Scalekit (GitHub, Zendesk, etc.)
5. Post responses back to Slack via Scalekit's slack_send_message tool

Benefits:
- No separate Slack bot needed
- Pure Scalekit integration
- Simpler OAuth setup
- Unified API for all services
"""

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Set

from flask import Flask, jsonify
from markupsafe import escape

from routing import get_router
from settings import Settings
from sk_connectors import get_connector

# Initialize Flask app for health checks and auth endpoints
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Initialize router
use_llm_routing = bool(Settings.OPENAI_API_KEY)
router = get_router(use_llm=use_llm_routing)

# Initialize Scalekit connector
connector = get_connector()

# Track processed message timestamps to avoid duplicates
processed_messages: Dict[str, Set[str]] = {}  # channel_id -> set of message timestamps

# Store last poll time for each channel
last_poll_time: Dict[str, float] = {}  # channel_id -> timestamp


def load_user_mappings() -> Dict[str, Any]:
    """Load user mappings from JSON file."""
    mapping_file = Path(Settings.USER_MAPPING_FILE)
    if not mapping_file.exists():
        print(f"⚠️  User mapping file not found: {Settings.USER_MAPPING_FILE}")
        return {}

    with open(mapping_file, 'r') as f:
        mappings = json.load(f)

    print(f"📋 Loaded {len(mappings)} user mappings")
    return mappings


def get_slack_identifier(user_id: str, user_mappings: Dict) -> str:
    """
    Get Scalekit identifier for a Slack user.

    Args:
        user_id: Slack user ID (e.g., U01234567)
        user_mappings: Dictionary of user mappings

    Returns:
        Scalekit identifier (email or custom ID)
    """
    if user_id not in user_mappings:
        print(f"⚠️  User {user_id} not mapped in {Settings.USER_MAPPING_FILE}")
        return None

    return user_mappings[user_id].get('scalekit_identifier')


def fetch_channel_messages(channel_id: str, identifier: str, limit: int = 10) -> List[Dict]:
    """
    Fetch recent messages from a Slack channel via Scalekit.

    Args:
        channel_id: Slack channel ID
        identifier: Scalekit user identifier
        limit: Number of messages to fetch

    Returns:
        List of message dictionaries
    """
    try:
        print(f"📥 Fetching messages from channel {channel_id}...")

        # Use last poll time if available, otherwise use lookback period
        if channel_id in last_poll_time:
            oldest_time = last_poll_time[channel_id]
            from datetime import datetime
            readable_time = datetime.fromtimestamp(oldest_time).strftime('%Y-%m-%d %H:%M:%S')
            print(f"   📅 Looking for messages since: {readable_time} (ts: {oldest_time})")
        else:
            # First poll - use lookback period to catch recent messages
            lookback_seconds = Settings.RESYNC_LOOKBACK_SECONDS if Settings.RESYNC_ON_START else Settings.POLL_LOOKBACK_SECONDS
            oldest_time = time.time() - lookback_seconds
            from datetime import datetime
            readable_time = datetime.fromtimestamp(oldest_time).strftime('%Y-%m-%d %H:%M:%S')
            print(f"   📅 First poll - looking back {lookback_seconds}s to: {readable_time}")

        result = connector.execute_action_with_retry(
            identifier=identifier,
            tool='slack_fetch_conversation_history',
            parameters={
                'channel': channel_id,
                'limit': limit,
                'oldest': str(oldest_time)
            }
        )

        if not result:
            print(f"❌ Failed to fetch messages")
            return []

        # Result from Scalekit is an ExecuteToolResponse object
        # The actual data is in result.data dictionary
        messages = []
        if hasattr(result, 'data') and isinstance(result.data, dict):
            messages = result.data.get('messages', [])
        elif isinstance(result, dict):
            messages = result.get('messages', [])

        print(f"✅ Fetched {len(messages)} messages from {channel_id}")

        # Update last poll boundary for the next fetch.
        # If we received messages, move the boundary to the newest message ts (minus a small overlap)
        # to avoid missing messages that arrive at the boundary. Dedupe prevents double-processing.
        if messages:
            try:
                max_ts = max(float(m.get('ts')) for m in messages if m.get('ts'))
                # Use configured overlap to be safe against rounding and ordering
                last_poll_time[channel_id] = max_ts - float(Settings.POLL_OVERLAP_SECONDS)
                from datetime import datetime
                readable_next = datetime.fromtimestamp(last_poll_time[channel_id]).strftime('%Y-%m-%d %H:%M:%S')
                print(f"   ⏭️  Next poll oldest set to: {readable_next} (ts: {last_poll_time[channel_id]:.6f})")
            except Exception:
                # Fallback to current time if parsing failed
                last_poll_time[channel_id] = time.time() - float(Settings.POLL_OVERLAP_SECONDS)
        else:
            # No messages returned: keep a small overlap to avoid racing with new arrivals
            boundary = time.time() - float(Settings.POLL_OVERLAP_SECONDS)
            last_poll_time[channel_id] = max(0.0, boundary)

        return messages

        # NOTE: Fallback retry without 'oldest' is intentionally not inside this
        # function to keep it single-responsibility. We handle empty-first-poll
        # fallback in the polling loop on first encounter.

    except Exception as e:
        print(f"❌ Error fetching messages from {channel_id}: {e}")
        return []


def is_message_processed(channel_id: str, message_ts: str) -> bool:
    """Check if a message has already been processed."""
    if channel_id not in processed_messages:
        processed_messages[channel_id] = set()

    return message_ts in processed_messages[channel_id]


def mark_message_processed(channel_id: str, message_ts: str):
    """Mark a message as processed."""
    if channel_id not in processed_messages:
        processed_messages[channel_id] = set()

    processed_messages[channel_id].add(message_ts)


def should_process_message(message: Dict) -> bool:
    """
    Determine if a message should be processed.

    Filters out:
    - Bot messages (unless from a real user)
    - Message edits/deletes
    - Empty messages
    - Thread replies (optional)
    """
    # Must have text content
    if not message.get('text'):
        return False

    # Ignore message edits/deletes
    if message.get('subtype') in ['message_changed', 'message_deleted']:
        return False

    # Allow messages from real users (has 'user' field)
    # Even if posted via API (might have bot_id but user takes precedence)
    if message.get('user'):
        return True

    # Ignore pure bot messages (no user field)
    if message.get('bot_id') or message.get('subtype') == 'bot_message':
        return False

    # Ignore thread replies (optional - remove this to process thread messages)
    if message.get('thread_ts') and message.get('thread_ts') != message.get('ts'):
        return False

    return True


def process_message(message: Dict, channel_id: str, user_mappings: Dict):
    """
    Process a single Slack message through the routing logic.

    Args:
        message: Slack message dictionary
        channel_id: Channel ID where message was posted
        user_mappings: User mapping dictionary
    """
    user_id = message.get('user')
    message_text = message.get('text', '')
    message_ts = message.get('ts')

    print(f"\n{'='*60}")
    print(f"📨 Processing message from {user_id}")
    print(f"   Channel: {channel_id}")
    print(f"   Text: {message_text[:100]}...")
    print(f"   Timestamp: {message_ts}")

    # Get Scalekit identifier for user
    identifier = get_slack_identifier(user_id, user_mappings)
    if not identifier:
        print(f"⚠️  User {user_id} not mapped - skipping message")
        print(f"{'='*60}\n")
        return

    # Route the message
    routing_result = router.route_message(
        message=message_text,
        user_id=user_id,
        channel_id=channel_id
    )

    # routing_result is an ActionResult object with success/message/data
    if not routing_result or not routing_result.success:
        print(f"⚠️  Routing failed: {routing_result.error if routing_result else 'Unknown error'}")
        print(f"{'='*60}\n")
        return

    # Get the action from the result data
    action = routing_result.data.get('action') if routing_result.data else None
    print(f"🎯 Routing decision: {action}")

    if not action or action == 'ignore' or action == 'none':
        print(f"   No action required - message ignored")
        print(f"{'='*60}\n")
        return

    # Execute the action
    action_result = execute_action(
        action=action,
        message_text=message_text,
        user_id=user_id,
        identifier=identifier,
        channel_id=channel_id,
        thread_ts=message_ts,
        user_mappings=user_mappings
    )

    print(f"{'='*60}\n")


def execute_action(
    action: str,
    message_text: str,
    user_id: str,
    identifier: str,
    channel_id: str,
    thread_ts: str,
    user_mappings: Dict
) -> Dict:
    """
    Execute an action based on routing decision.

    Args:
        action: Action to execute (e.g., 'github_issue_create')
        message_text: Original message text
        user_id: Slack user ID
        identifier: Scalekit identifier
        channel_id: Slack channel ID
        thread_ts: Message timestamp (for threading replies)
        user_mappings: User mappings dictionary

    Returns:
        Dictionary with action result
    """
    try:
        if action == 'github_issue_create':
            return execute_github_action(
                message_text, identifier, user_mappings,
                user_id, channel_id, thread_ts
            )
        elif action == 'zendesk_create_ticket':
            return execute_zendesk_action(
                message_text, identifier, user_mappings,
                user_id, channel_id, thread_ts
            )
        else:
            print(f"⚠️  Unknown action: {action}")
            return {'success': False, 'error': 'Unknown action'}

    except Exception as e:
        print(f"❌ Error executing action {action}: {e}")
        return {'success': False, 'error': str(e)}


def execute_github_action(
    message_text: str,
    identifier: str,
    user_mappings: Dict,
    user_id: str,
    channel_id: str,
    thread_ts: str
) -> Dict:
    """Execute GitHub issue creation."""
    print(f"📋 Creating GitHub issue...")

    # Get user's GitHub username
    github_username = user_mappings.get(user_id, {}).get('github_username')

    # Create issue via Scalekit
    result = connector.execute_action_with_retry(
        identifier=identifier,
        tool='github_issue_create',
        parameters={
            'title': f"[Slack Triage] {message_text[:50]}",
            'body': f"**From Slack:**\n\n{message_text}\n\n**Reporter:** {github_username or user_id}",
            'assignees': [github_username] if github_username else []
        }
    )


    if not result:
        print("❌ Failed to create GitHub issue: no result returned")
        send_slack_message(
            channel_id=channel_id,
            identifier=identifier,
            text="❌ Failed to create GitHub issue: empty result",
            thread_ts=thread_ts
        )
        return {"success": False, "error": "empty result"}

    # Handle common shapes: raw GitHub issue dict or nested variants
    issue_number = (
        result.get("number")
        or result.get("issue", {}).get("number")
        or result.get("data", {}).get("number")
    )
    issue_url = (
        result.get("html_url")
        or result.get("issue", {}).get("html_url")
        or result.get("data", {}).get("html_url")
    )

    if issue_number and issue_url:
        print(f"✅ GitHub issue #{issue_number} created")
        send_slack_message(
            channel_id=channel_id,
            identifier=identifier,
            text=f"✅ *GitHub Issue Created*\n📋 Issue: #{issue_number}\n🔗 {issue_url}",
            thread_ts=thread_ts
        )
    else:
        print(f"❌ Failed to create GitHub issue: unexpected result shape {list(result.keys())}")
        send_slack_message(
            channel_id=channel_id,
            identifier=identifier,
            text="❌ Failed to create GitHub issue: unexpected result shape",
            thread_ts=thread_ts
        )
    return result


def execute_zendesk_action(
    message_text: str,
    identifier: str,
    user_mappings: Dict,
    user_id: str,
    channel_id: str,
    thread_ts: str
) -> Dict:
    """Execute Zendesk ticket creation. (Not supported - Scalekit doesn't have Zendesk yet)"""
    print(f"⚠️ Zendesk not available")
    send_slack_message(
        channel_id=channel_id,
        identifier=identifier,
        text=f"⚠️ Zendesk integration not available.",
        thread_ts=thread_ts
    )
    return {"success": False, "error": "Zendesk not supported"}


def send_slack_message(channel_id: str, identifier: str, text: str, thread_ts: str = None):
    """
    Send a message to Slack via Scalekit.

    Args:
        channel_id: Channel to post to
        identifier: Scalekit user identifier
        text: Message text
        thread_ts: Optional thread timestamp for replies
    """
    try:
        params = {
            'channel': channel_id,
            'text': text
        }

        if thread_ts:
            params['thread_ts'] = thread_ts

        result = connector.execute_action_with_retry(
            identifier=identifier,
            tool='slack_send_message',
            parameters=params
        )

        if result:
            print(f"✅ Posted message to Slack channel {channel_id}")
        else:
            print(f"❌ Failed to post to Slack")

    except Exception as e:
        print(f"❌ Error sending Slack message: {e}")


def poll_channels(user_mappings: Dict):
    """
    Poll all configured Slack channels for new messages.

    This runs continuously in a loop, checking each channel
    at regular intervals.
    """
    if not Settings.ALLOWED_CHANNELS:
        print("⚠️  No channels configured in ALLOWED_CHANNELS")
        return

    # Get first user's identifier for fetching messages
    # In production, you might want to use a service account
    first_user = list(user_mappings.values())[0] if user_mappings else None
    if not first_user:
        print("❌ No users configured in user_mapping.json")
        return

    identifier = first_user.get('scalekit_identifier')
    if not identifier:
        print("❌ No scalekit_identifier found for first user")
        return

    print(f"\n{'='*60}")
    print(f"🔄 Starting polling loop for {len(Settings.ALLOWED_CHANNELS)} channels")
    print(f"   Channels: {Settings.ALLOWED_CHANNELS}")
    print(f"   Poll interval: {Settings.POLL_INTERVAL_SECONDS}s")
    print(f"{'='*60}\n")

    while True:
        try:
            for channel_id in Settings.ALLOWED_CHANNELS:
                # Skip denied channels
                if channel_id in Settings.DENIED_CHANNELS:
                    continue

                # Fetch messages
                first_fetch = channel_id not in last_poll_time
                messages = fetch_channel_messages(channel_id, identifier)

                # One-time fallback: If first fetch returns 0 messages and a larger
                # fallback window is configured, attempt a single wider fetch to
                # avoid missing recent history due to too-small lookback.
                if first_fetch and not messages and Settings.POLL_EMPTY_FALLBACK_SECONDS > Settings.POLL_LOOKBACK_SECONDS:
                    try:
                        lookback_seconds = Settings.POLL_EMPTY_FALLBACK_SECONDS
                        oldest_time = time.time() - lookback_seconds
                        from datetime import datetime
                        readable_time = datetime.fromtimestamp(oldest_time).strftime('%Y-%m-%d %H:%M:%S')
                        print(f"   ↻ First poll empty; retrying with wider lookback {lookback_seconds}s to: {readable_time}")

                        result = connector.execute_action_with_retry(
                            identifier=identifier,
                            tool='slack_fetch_conversation_history',
                            parameters={
                                'channel': channel_id,
                                'limit': 10,
                                'oldest': str(oldest_time)
                            }
                        )
                        alt_messages = []
                        if result:
                            if hasattr(result, 'data') and isinstance(result.data, dict):
                                alt_messages = result.data.get('messages', [])
                            elif isinstance(result, dict):
                                alt_messages = result.get('messages', [])
                        print(f"   ↻ Fallback fetched {len(alt_messages)} messages")
                        # Use whichever list is non-empty (prefer fallback if it found any)
                        if alt_messages:
                            messages = alt_messages
                            # Set boundary based on newest message like fetch_channel_messages
                            try:
                                max_ts = max(float(m.get('ts')) for m in messages if m.get('ts'))
                                last_poll_time[channel_id] = max_ts - float(Settings.POLL_OVERLAP_SECONDS)
                            except Exception:
                                last_poll_time[channel_id] = time.time() - float(Settings.POLL_OVERLAP_SECONDS)
                    except Exception as e:
                        print(f"   ⚠️ Fallback fetch error: {e}")

                # Process each message
                for message in reversed(messages):  # Process oldest first
                    message_ts = message.get('ts')
                    message_text = message.get('text', '')[:80]
                    from datetime import datetime
                    readable_ts = datetime.fromtimestamp(float(message_ts)).strftime('%H:%M:%S')

                    # Skip if already processed
                    if is_message_processed(channel_id, message_ts):
                        print(f"   ⏭️  [{readable_ts}] Already processed: {message_text}...")
                        continue

                    # Check if message should be processed
                    if not should_process_message(message):
                        print(f"   🚫 [{readable_ts}] Skipping (bot/system): {message_text}...")
                        mark_message_processed(channel_id, message_ts)
                        continue

                    # Process the message
                    print(f"\n   📋 [{readable_ts}] NEW MESSAGE: {message_text}")
                    print(f"   👤 User: {message.get('user')}")
                    print(f"   ✅ Processing...\n")
                    process_message(message, channel_id, user_mappings)

                    # Mark as processed
                    mark_message_processed(channel_id, message_ts)

            # Wait before next poll
            print(f"⏳ Waiting {Settings.POLL_INTERVAL_SECONDS}s before next poll...")
            time.sleep(Settings.POLL_INTERVAL_SECONDS)

        except KeyboardInterrupt:
            print("\n\n🛑 Gracefully stopping polling loop...")
            print("   Cleaning up resources...")
            break
        except Exception as e:
            print(f"❌ Error in polling loop: {e}")
            import traceback
            traceback.print_exc()
            print(f"\n⏳ Waiting {Settings.POLL_INTERVAL_SECONDS}s before retrying...")
            try:
                time.sleep(Settings.POLL_INTERVAL_SECONDS)
            except KeyboardInterrupt:
                print("\n🛑 Interrupted during retry wait - stopping...")
                break

    print("\n" + "="*60)
    print("✅ Polling loop stopped successfully")
    print("="*60 + "\n")


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'slack-triage-agent-polling',
        'mode': 'polling',
        'config': Settings.get_summary()
    }), 200


@app.route('/auth/init', methods=['GET'])
def auth_init():
    """
    Initialize OAuth flow for connecting user accounts.

    Query params:
        user_id: Slack user ID
        service: Service to connect (slack, github, zendesk)
    """
    from flask import request
    from markupsafe import escape

    user_id = request.args.get('user_id')
    service = request.args.get('service')

    if not user_id or not service:
        return jsonify({'error': 'Missing user_id or service parameter'}), 400

    # Load user mappings
    user_mappings = load_user_mappings()
    identifier = get_slack_identifier(user_id, user_mappings)

    if not identifier:
        return jsonify({'error': f'User {user_id} not found in user_mapping.json'}), 404

    # Build redirect URI (where Scalekit will redirect after OAuth)
    # Use configured redirect URI, or default to localhost
    redirect_uri = Settings.OAUTH_REDIRECT_URI or f"http://localhost:{Settings.FLASK_PORT}/auth/callback"

    # Generate auth URL
    auth_url = connector.get_authorization_url(service, identifier, redirect_uri)

    if not auth_url:
        return jsonify({'error': 'Failed to generate authorization URL'}), 500

    # Redirect to auth URL
    from flask import redirect
    return redirect(auth_url)


@app.route('/auth/callback', methods=['GET'])
@app.route('/callback', methods=['GET'])
def auth_callback():
    """
    OAuth callback endpoint.

    After user authorizes a service, Scalekit redirects here with authorization code.
    The code is automatically handled by Scalekit - we just show success message.

    Supports both /auth/callback and /callback paths for flexibility.
    """
    from flask import request

    # Get query parameters from OAuth callback
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    error_description = request.args.get('error_description', '')

    if error:
        return f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
                <h1 style="color: #d32f2f;">❌ Authorization Failed</h1>
                <p><strong>Error:</strong> {escape(error)}</p>
                <p><strong>Description:</strong> {escape(error_description)}</p>
                <p><a href="/">Go back</a></p>
            </body>
        </html>
        """, 400

    if code:
        return """
        <html>
            <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
                <h1 style="color: #4caf50;">✅ Authorization Successful!</h1>
                <p>You have successfully authorized the connection.</p>
                <p>You can now close this window and return to Slack.</p>
                <p><a href="/">Go to home</a></p>
            </body>
        </html>
        """

    return "Invalid callback", 400


@app.route('/users', methods=['GET'])
def list_users():
    """List all mapped users."""
    user_mappings = load_user_mappings()
    return jsonify({
        'count': len(user_mappings),
        'users': list(user_mappings.keys())
    }), 200


def run_polling_mode():
    """Run the agent in polling mode."""
    print("\n" + "="*60)
    print("🚀 Starting Slack Triage Agent (Polling Mode)")
    print("="*60)
    print("\n📋 Configuration:")
    for key, value in Settings.get_summary().items():
        print(f"   {key}: {value}")

    print("\n💡 Mode: Polling (Scalekit-native)")
    print("   - No separate Slack bot needed")
    print("   - All operations via Scalekit API")
    print("   - Polls channels every {}s".format(Settings.POLL_INTERVAL_SECONDS))

    print("\n📡 Endpoints:")
    print(f"   GET  http://localhost:{Settings.FLASK_PORT}/health")
    print(f"   GET  http://localhost:{Settings.FLASK_PORT}/auth/init?user_id=USER_ID&service=SERVICE")
    print(f"   GET  http://localhost:{Settings.FLASK_PORT}/auth/callback (OAuth redirect)")
    print(f"   GET  http://localhost:{Settings.FLASK_PORT}/users")

    print("\n💡 Next steps:")
    # Use first mapped user ID if available, otherwise show placeholder
    try:
        sample_user_id = next(iter(load_user_mappings().keys()))
    except StopIteration:
        sample_user_id = "USER_ID"
    print("   1. Authorize Slack: http://localhost:{}/auth/init?user_id={}&service=slack".format(Settings.FLASK_PORT, sample_user_id))
    print("   2. Authorize GitHub: http://localhost:{}/auth/init?user_id={}&service=github".format(Settings.FLASK_PORT, sample_user_id))
    print("   3. Post test message in monitored Slack channel")
    print("   4. Watch logs for message processing")

    print("\n" + "="*60 + "\n")

    # Load user mappings
    user_mappings = load_user_mappings()

    if not user_mappings:
        print("❌ No users configured. Please add users to user_mapping.json")
        return

    # Start Flask server in background thread
    import threading
    flask_thread = threading.Thread(
        target=lambda: app.run(
            host=Settings.FLASK_HOST,
            port=Settings.FLASK_PORT,
            debug=False,
            use_reloader=False
        )
    )
    flask_thread.daemon = True
    flask_thread.start()

    print("🌐 Flask server started in background")
    print(f"   Running on http://{Settings.FLASK_HOST}:{Settings.FLASK_PORT}\n")

    # Start polling
    poll_channels(user_mappings)


if __name__ == "__main__":
    try:
        run_polling_mode()
    except KeyboardInterrupt:
        print("\n\n👋 Agent stopped by user")
        print("   Have a great day!\n")
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        print("\n")
