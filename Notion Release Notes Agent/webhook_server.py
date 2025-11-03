"""
webhook_server.py - GitHub → Notion Release Notes Agent

Receives GitHub webhooks for pull_request events, and on PR merged:
 - Fetches commits with pagination
 - Upserts a Notion page in the configured database (idempotent per PR SHA)
 - Sends a Slack notification with the Notion page link (via Scalekit tools)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from flask import Flask, jsonify, request

from notion_service import (NotionReleaseNotes, _resolve_identifier,
                            summarize_commits_simple)
from settings import Settings
from sk_connectors import get_connector

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger("release-notes-agent")

app = Flask(__name__)


@dataclass
class PRContext:
    owner: str
    repo: str
    number: int
    merged: bool
    merge_commit_sha: Optional[str]
    title: str
    body: str
    html_url: str
    compare_url: Optional[str]


def _validate_signature(raw_body: bytes, signature: str) -> bool:
    # Allow local testing without signature validation
    logger.info(f"DEBUG: ALLOW_LOCAL_TESTING = {Settings.ALLOW_LOCAL_TESTING}")
    if Settings.ALLOW_LOCAL_TESTING:
        logger.info("Local testing mode enabled; skipping signature validation")
        return True

    secret = (Settings.GITHUB_WEBHOOK_SECRET or "").encode()
    if not secret:
        logger.warning("No GITHUB_WEBHOOK_SECRET configured; skipping signature validation")
        return True
    sig = signature or ""
    try:
        sha_name, signature = sig.split("=", 1)
    except ValueError:
        return False
    if sha_name != "sha256":
        return False
    mac = hmac.new(secret, msg=raw_body, digestmod=hashlib.sha256)
    expected = mac.hexdigest()
    return hmac.compare_digest(expected, signature)


def _get_pr_context(payload: Dict[str, Any]) -> Optional[PRContext]:
    try:
        action = payload.get("action")
        pr = payload.get("pull_request", {})
        merged = pr.get("merged", False)
        base = pr.get("base", {})
        repo = payload.get("repository", {})
        ctx = PRContext(
            owner=repo.get("owner", {}).get("login") or base.get("repo", {}).get("owner", {}).get("login"),
            repo=repo.get("name") or base.get("repo", {}).get("name"),
            number=pr.get("number"),
            merged=merged,
            merge_commit_sha=pr.get("merge_commit_sha"),
            title=pr.get("title") or "",
            body=pr.get("body") or "",
            html_url=pr.get("html_url") or "",
            compare_url=pr.get("_links", {}).get("html", {}).get("href"),
        )
        if action != "closed" or not merged:
            return None
        return ctx
    except Exception as e:
        logger.exception("Failed to parse PR context: %s", e)
        return None


def _fetch_commits(owner: str, repo: str, pr_number: int) -> List[Dict[str, Any]]:
    """Fetch PR commits via Scalekit GitHub tool, handling pagination."""
    connector = get_connector()
    identifier = _resolve_identifier()
    commits: List[Dict[str, Any]] = []
    page = 1
    per_page = 100
    while True:
        params = {
            "owner": owner,
            "repo": repo,
            "page": page,
            "per_page": per_page,
            "state": None,
            "sort": None,
            "direction": None,
            # Using pull_requests_list to get PR and then commit listing is not available as tool in docs,
            # fallback: use github_file_contents_get is irrelevant, so we assume a tool 'github_pull_commits_list'
        }
        res = connector.execute_action_with_retry(
            identifier=identifier,
            tool=Settings.GITHUB_COMMITS_TOOL_NAME,
            parameters={
                "owner": owner,
                "repo": repo,
                "pull_number": pr_number,
                "page": page,
                "per_page": per_page,
            },
        )
        if not isinstance(res, dict):
            logger.error("Unexpected response from github_pull_commits_list: %s", res)
            break
        batch = res.get("items") or res.get("data") or res.get("result") or []
        if not isinstance(batch, list):
            logger.error("Unexpected batch shape: %s", type(batch))
            break
        commits.extend(batch)
        logger.info("Fetched %d commits (page %d)", len(batch), page)
        if len(batch) < per_page:
            break
        page += 1
    return commits


def _post_slack_link(notion_url: str, ctx: PRContext) -> None:
    if not Settings.SLACK_ANNOUNCE_CHANNEL:
        logger.info("SLACK_ANNOUNCE_CHANNEL not set; skipping Slack notification")
        return
    connector = get_connector()
    # Pick any mapped user to execute Slack tool; prefer first mapping
    try:
        import json as _json
        from pathlib import Path
        mpath = Path(Settings.USER_MAPPING_FILE)
        if mpath.exists():
            mappings = _json.loads(mpath.read_text() or "{}")
            if mappings:
                _, info = next(iter(mappings.items()))
                identifier = info.get("scalekit_identifier")
            else:
                identifier = None
        else:
            identifier = None
    except Exception:
        identifier = None

    if not identifier:
        logger.warning("No user mapping found; cannot send Slack message via Scalekit")
        return

    text = (
        f"Release notes for PR #{ctx.number} merged in {ctx.owner}/{ctx.repo}:\n"
        f"{notion_url}"
    )
    res = connector.execute_action_with_retry(
        identifier=identifier,
        tool="slack_send_message",
        parameters={"channel": Settings.SLACK_ANNOUNCE_CHANNEL, "text": text},
    )
    if res:
        logger.info("Posted Slack notification to %s", Settings.SLACK_ANNOUNCE_CHANNEL)
    else:
        logger.error("Failed to post Slack notification")


@app.route("/webhook/github", methods=["POST"])
def github_webhook():
    raw = request.get_data()
    sig = request.headers.get("X-Hub-Signature-256", "")
    if not _validate_signature(raw, sig):
        return jsonify({"error": "invalid signature"}), 401

    event = request.headers.get("X-GitHub-Event", "")
    try:
        payload = request.get_json(force=True, silent=True) or {}
    except Exception:
        payload = {}

    logger.info("Received event=%s action=%s", event, payload.get("action"))
    if event != "pull_request":
        return jsonify({"status": "ignored", "reason": "not a pull_request event"}), 200

    ctx = _get_pr_context(payload)
    if not ctx:
        return jsonify({"status": "ignored", "reason": "not a merged PR"}), 200

    # Idempotency on merge SHA
    notion = NotionReleaseNotes()

    # Note: Skipping commit fetching because github_pull_commits_list tool doesn't exist in Scalekit
    # Using PR body/description as the content instead
    logger.info("Skipping commit fetch (tool not available); using PR description")
    commits = []

    # Use PR body as summary if available
    summary = ctx.body if ctx.body else f"Merged PR #{ctx.number}: {ctx.title}"

    links = {
        "pr_url": ctx.html_url,
        "compare_url": ctx.compare_url or "",
    }
    page_url = notion.upsert_release_notes(
        title=ctx.title or f"PR #{ctx.number} merged",
        pr_sha=ctx.merge_commit_sha or f"pr-{ctx.number}",
        pr_number=ctx.number,
        repo=f"{ctx.owner}/{ctx.repo}",
        status="Merged",
        commits=commits,
        summary=summary,
        links=links,
    )

    if not page_url:
        return jsonify({"error": "failed to upsert notion"}), 500

    _post_slack_link(page_url, ctx)
    return jsonify({"status": "ok", "notion_url": page_url}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "config": Settings.get_summary(),
    })

@app.get("/")
def index():
        summary = Settings.get_summary()
        html = f"""
        <html>
            <head>
                <title>Release Notes Agent</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 2rem; }}
                    code {{ background: #f5f5f5; padding: 2px 4px; border-radius: 4px; }}
                    .ok {{ color: #2e7d32; }}
                    .warn {{ color: #f57c00; }}
                </style>
            </head>
            <body>
                <h2>🚀 GitHub → Notion Release Notes Agent</h2>
                <p>Server is running. Use the endpoints below:</p>
                <ul>
                    <li><a href="/health">GET /health</a> — basic status and config summary</li>
                    <li><code>POST /webhook/github</code> — configure this as your GitHub Webhook target</li>
                    <li><a href="/auth">GET /auth</a> — 🔐 authorize Slack/Notion with Scalekit</li>
                </ul>
                <h3>Configuration</h3>
                <ul>
                    <li>Notion configured: <span class="{ 'ok' if summary.get('notion_configured') else 'warn' }">{summary.get('notion_configured')}</span></li>
                    <li>Webhook secret configured: <span class="{ 'ok' if summary.get('webhook_secret_configured') else 'warn' }">{summary.get('webhook_secret_configured')}</span></li>
                </ul>
                <p>If items show as false, set the required environment variables and restart.</p>
            </body>
        </html>
        """
        return html, 200, {"Content-Type": "text/html; charset=utf-8"}


@app.route("/auth", methods=["GET"])
def auth_page():
    """Show available users and authorization links."""
    try:
        import json as _json
        from pathlib import Path
        mpath = Path(Settings.USER_MAPPING_FILE)

        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization - Release Notes Agent</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
                h1 { color: #2c3e50; }
                .user-card { background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 15px 0; border-radius: 4px; }
                .btn { display: inline-block; padding: 10px 20px; margin: 5px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
                .btn:hover { background: #0056b3; }
                .btn-slack { background: #4A154B; }
                .btn-slack:hover { background: #611f69; }
                .btn-notion { background: #000; }
                .btn-notion:hover { background: #333; }
                .error { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; border-radius: 4px; color: #721c24; }
                .info { background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 15px 0; border-radius: 4px; color: #0c5460; }
                code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <h1>🔐 Authorization</h1>
        """

        if not mpath.exists():
            html += """
            <div class="error">
                <strong>⚠️ user_mapping.json not found!</strong><br><br>
                Create it by copying user_mapping.example.json:<br>
                <code>copy user_mapping.example.json user_mapping.json</code>
            </div>
            """
        else:
            mappings = _json.loads(mpath.read_text() or "{}")
            if not mappings or all(k.startswith("_") for k in mappings.keys()):
                html += """
                <div class="error">
                    <strong>⚠️ No users configured in user_mapping.json!</strong><br><br>
                    Edit user_mapping.json and add your Slack user ID and email.
                </div>
                """
            else:
                html += """
                <div class="info">
                    <strong>📋 Available Users</strong><br>
                    Click the buttons below to authorize Slack or Notion for each user.
                </div>
                """

                for user_id, info in mappings.items():
                    if user_id.startswith("_"):
                        continue

                    identifier = info.get("scalekit_identifier", "N/A")
                    github = info.get("github_username", "N/A")

                    html += f"""
                    <div class="user-card">
                        <h3>👤 User: {user_id}</h3>
                        <p><strong>Email:</strong> {identifier}</p>
                        <p><strong>GitHub:</strong> {github}</p>
                        <div>
                            <a href="/auth/init?service=slack&user_id={user_id}" class="btn btn-slack">🔗 Authorize Slack</a>
                            <a href="/auth/init?service=notion&user_id={user_id}" class="btn btn-notion">🔗 Authorize Notion</a>
                        </div>
                    </div>
                    """

        html += """
            <hr>
            <p><a href="/">← Back to Home</a></p>
        </body>
        </html>
        """
        return html, 200, {"Content-Type": "text/html; charset=utf-8"}
    except Exception as e:
        logger.exception("auth_page failed: %s", e)
        return f"<h1>Error</h1><p>{str(e)}</p>", 500


@app.route("/auth/init", methods=["GET"])
def auth_init():
    """Generate an authorization link for a service (e.g., Slack) via Scalekit."""
    service = request.args.get("service", "slack")
    user_id = request.args.get("user_id")
    if not user_id:
        return """
        <html>
        <body>
            <h1>⚠️ Missing user_id</h1>
            <p>Please go to <a href="/auth">/auth</a> to select a user and service to authorize.</p>
        </body>
        </html>
        """, 400
    try:
        import json as _json
        from pathlib import Path
        mpath = Path(Settings.USER_MAPPING_FILE)
        if not mpath.exists():
            return jsonify({"error": "user_mapping.json not found"}), 404
        mappings = _json.loads(mpath.read_text() or "{}")
        info = mappings.get(user_id)
        if not info or not info.get("scalekit_identifier"):
            return jsonify({"error": f"No scalekit_identifier for user {user_id}"}), 404
        identifier = info["scalekit_identifier"]
        connector = get_connector()
        link = connector.get_authorization_url(service, identifier)
        if not link:
            return jsonify({"error": "failed to generate authorization link"}), 500
        return jsonify({"link": link})
    except Exception as e:
        logger.exception("auth_init failed: %s", e)
        return jsonify({"error": str(e)}), 500


def run():
    # Startup config warnings to help setup
    if Settings.NOTION_VIA_SCALEKIT:
        if not Settings.NOTION_DATABASE_ID:
            logger.warning("NOTION_DATABASE_ID not set. Notion upsert will fail. Set this to your Notion database ID.")
        else:
            logger.info("✓ Notion via Scalekit mode enabled with database ID configured")
    else:
        if not (Settings.NOTION_API_KEY and Settings.NOTION_DATABASE_ID):
            logger.warning("Notion direct mode enabled but NOTION_API_KEY/NOTION_DATABASE_ID missing. Webhooks will fail.")

    if not Settings.GITHUB_WEBHOOK_SECRET:
        logger.warning("GITHUB_WEBHOOK_SECRET not set. Signature validation will be skipped; NOT recommended for production.")

    if not Settings.SLACK_ANNOUNCE_CHANNEL:
        logger.info("SLACK_ANNOUNCE_CHANNEL not set. Slack notifications will be skipped.")

    # Check if we have at least one user identifier for tool execution
    identifier = _resolve_identifier()
    if not identifier:
        logger.warning("No scalekit_identifier found in user_mapping.json and SCALEKIT_DEFAULT_IDENTIFIER not set. Tool execution will fail.")
    else:
        logger.info(f"✓ Using identifier for tool execution: {identifier[:20]}...")

    logger.info("Starting webhook server on %s:%s", Settings.FLASK_HOST, Settings.FLASK_PORT)
    app.run(host=Settings.FLASK_HOST, port=Settings.FLASK_PORT, debug=Settings.FLASK_DEBUG)


if __name__ == "__main__":
    run()
