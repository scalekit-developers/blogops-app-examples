"""
GitHub Polling Server - Alternative to Webhooks

Polls GitHub every N seconds for newly merged PRs and creates Notion pages.
NO ngrok/cloudflared/tunnels needed!

Usage:
    python polling_server.py [--interval SECONDS]

Example:
    python polling_server.py --interval 60  # Check every 60 seconds
"""

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from notion_service import NotionReleaseNotes
from settings import Settings
from sk_connectors import get_connector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("polling-agent")


class PollingAgent:
    """Polls GitHub for merged PRs and creates Notion pages"""

    def __init__(self, interval: int = 60):
        self.interval = interval
        self.seen_prs: Set[int] = set()
        self.state_file = Path("polling_state.json")
        self.connector = get_connector()
        logger.info(f"✅ Polling agent initialized (check every {interval}s)")

        # Load previously seen PRs from state file
        self._load_state()

    def _load_state(self):
        """Load previously seen PR numbers from state file"""
        if self.state_file.exists():
            try:
                with open(self.state_file, "r") as f:
                    state = json.load(f)
                    self.seen_prs = set(state.get("seen_prs", []))
                    logger.info(f"📋 Loaded {len(self.seen_prs)} previously seen PRs")
            except Exception as e:
                logger.warning(f"⚠️ Could not load state file: {e}")

    def _save_state(self):
        """Save seen PR numbers to state file"""
        try:
            with open(self.state_file, "w") as f:
                json.dump({"seen_prs": list(self.seen_prs)}, f)
        except Exception as e:
            logger.warning(f"⚠️ Could not save state file: {e}")

    def _get_recent_merged_prs(self) -> List[Dict[str, Any]]:
        """
        Fetch recently merged PRs from GitHub

        Returns list of PRs with structure:
        {
            "number": 123,
            "title": "Fix bug",
            "body": "Description...",
            "merged_at": "2025-10-14T10:00:00Z",
            "merge_commit_sha": "abc123",
            "html_url": "https://github.com/...",
            "user": {"login": "username"}
        }
        """
        try:
            logger.info(f"🔍 Checking for merged PRs in {Settings.GITHUB_REPO_OWNER}/{Settings.GITHUB_REPO_NAME}")

            # Use Scalekit GitHub tool to list PRs
            result = self.connector.execute_action_with_retry(
                identifier=Settings.SCALEKIT_DEFAULT_IDENTIFIER,
                tool="github_pull_requests_list",
                parameters={
                    "owner": Settings.GITHUB_REPO_OWNER,
                    "repo": Settings.GITHUB_REPO_NAME,
                    "state": "closed",  # Get closed PRs
                    "per_page": 30,  # Check last 30 closed PRs
                    "sort": "updated",
                    "direction": "desc"
                },
            )

            if not result:
                logger.error(f"❌ Failed to fetch PRs")
                return []

            # Result is the direct response data - Scalekit returns {'array': [...]}
            all_prs = result if isinstance(result, list) else result.get("array", [])

            logger.info(f"📋 Found {len(all_prs)} closed PRs total")

            # Filter for merged PRs in last 24 hours
            merged_prs = []
            now = datetime.utcnow()
            cutoff = now - timedelta(hours=24)

            for pr in all_prs:
                # Check if PR was merged (not just closed)
                if pr.get("merged_at"):
                    # Parse merge time
                    merged_at_str = pr.get("merged_at")
                    try:
                        merged_at = datetime.fromisoformat(merged_at_str.replace("Z", "+00:00"))
                        # Only include PRs merged in last 24 hours
                        if merged_at.replace(tzinfo=None) >= cutoff:
                            merged_prs.append(pr)
                    except Exception as e:
                        logger.warning(f"⚠️ Could not parse merge time for PR #{pr.get('number')}: {e}")

            logger.info(f"✅ Found {len(merged_prs)} merged PRs in last 24 hours")
            return merged_prs

        except Exception as e:
            logger.error(f"❌ Error fetching PRs: {e}", exc_info=True)
            return []

    def _process_pr(self, pr: Dict[str, Any]) -> bool:
        """
        Process a single merged PR

        Returns True if successful, False otherwise
        """
        pr_number = pr.get("number")
        title = pr.get("title", "Untitled PR")

        try:
            logger.info(f"📝 Processing PR #{pr_number}: {title}")

            # Create PR context (similar to webhook handler)
            pr_context = {
                "number": pr_number,
                "title": title,
                "body": pr.get("body", ""),
                "html_url": pr.get("html_url"),
                "merge_commit_sha": pr.get("merge_commit_sha"),
                "merged_at": pr.get("merged_at"),
                "user": pr.get("user", {}).get("login", "unknown"),
                "base_ref": pr.get("base", {}).get("ref", "main"),
                "head_ref": pr.get("head", {}).get("ref", "unknown"),
            }

            # Create Notion page
            logger.info(f"📄 Creating Notion page for PR #{pr_number}")

            notion = NotionReleaseNotes()
            summary = pr.get("body", "") if pr.get("body") else f"Merged PR #{pr_number}: {title}"

            links = {
                "pr_url": pr_context["html_url"],
                "compare_url": "",
            }

            notion_url = notion.upsert_release_notes(
                title=title or f"PR #{pr_number} merged",
                pr_sha=pr_context["merge_commit_sha"] or f"pr-{pr_number}",
                pr_number=pr_number,
                repo=f"{Settings.GITHUB_REPO_OWNER}/{Settings.GITHUB_REPO_NAME}",
                status="Merged",
                commits=[],  # Not fetching commits
                summary=summary,
                links=links,
            )

            if notion_url:
                logger.info(f"✅ Created Notion page: {notion_url}")

                # Post to Slack
                self._post_slack_notification(pr_context, notion_url)

                # Mark as seen
                self.seen_prs.add(pr_number)
                self._save_state()

                return True
            else:
                logger.error(f"❌ Failed to create Notion page for PR #{pr_number}")
                return False

        except Exception as e:
            logger.error(f"❌ Error processing PR #{pr_number}: {e}", exc_info=True)
            return False

    def _post_slack_notification(self, pr_context: Dict[str, Any], notion_url: str):
        """Post Slack notification about new Notion page"""
        try:
            # Load user mapping
            user_mapping_file = Path(Settings.USER_MAPPING_FILE)
            if not user_mapping_file.exists():
                logger.warning("⚠️ user_mapping.json not found, skipping Slack notification")
                return

            with open(user_mapping_file, "r") as f:
                user_mapping = json.load(f)

            if not user_mapping:
                logger.warning("⚠️ user_mapping.json is empty, skipping Slack notification")
                return

            # Use first user's identifier
            first_user = next(iter(user_mapping.values()))
            scalekit_identifier = first_user.get("scalekit_identifier")

            if not scalekit_identifier:
                logger.warning("⚠️ No scalekit_identifier in user_mapping.json")
                return

            # Send Slack message
            message = (
                f"Release notes for PR #{pr_context['number']} merged in "
                f"{Settings.GITHUB_REPO_OWNER}/{Settings.GITHUB_REPO_NAME}:\n"
                f"{notion_url}"
            )

            result = self.connector.execute_action_with_retry(
                identifier=scalekit_identifier,
                tool="slack_send_message",
                parameters={
                    "channel": Settings.SLACK_ANNOUNCE_CHANNEL,
                    "text": message,
                },
            )

            if result:
                logger.info(f"✅ Posted Slack notification to {Settings.SLACK_ANNOUNCE_CHANNEL}")
            else:
                logger.error(f"❌ Failed to post Slack notification")

        except Exception as e:
            logger.error(f"❌ Error posting Slack notification: {e}", exc_info=True)

    def poll_once(self):
        """Perform one polling cycle"""
        logger.info("=" * 60)
        logger.info(f"🔄 Starting polling cycle at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        try:
            # Fetch recently merged PRs
            merged_prs = self._get_recent_merged_prs()

            if not merged_prs:
                logger.info("✅ No new merged PRs found")
                return

            # Process new PRs (ones we haven't seen before)
            new_prs = [pr for pr in merged_prs if pr.get("number") not in self.seen_prs]

            if not new_prs:
                logger.info(f"✅ All {len(merged_prs)} merged PRs already processed")
                return

            logger.info(f"🎯 Found {len(new_prs)} new merged PRs to process")

            # Process each new PR
            for pr in new_prs:
                self._process_pr(pr)
                # Small delay between PRs to avoid rate limits
                time.sleep(2)

            logger.info(f"✅ Polling cycle complete - processed {len(new_prs)} PRs")

        except Exception as e:
            logger.error(f"❌ Error in polling cycle: {e}", exc_info=True)

    def run(self):
        """Run continuous polling loop"""
        logger.info("=" * 60)
        logger.info("🚀 Starting GitHub Polling Agent")
        logger.info(f"📍 Repository: {Settings.GITHUB_REPO_OWNER}/{Settings.GITHUB_REPO_NAME}")
        logger.info(f"⏱️  Poll interval: {self.interval} seconds")
        logger.info(f"📄 Notion DB: {Settings.NOTION_DATABASE_ID[:20]}...")
        logger.info(f"💬 Slack channel: {Settings.SLACK_ANNOUNCE_CHANNEL}")
        logger.info("=" * 60)

        try:
            while True:
                self.poll_once()
                logger.info(f"😴 Sleeping for {self.interval} seconds...")
                time.sleep(self.interval)
        except KeyboardInterrupt:
            logger.info("\n👋 Shutting down polling agent...")
            logger.info(f"📊 Total PRs processed: {len(self.seen_prs)}")


def main():
    """Entry point"""
    parser = argparse.ArgumentParser(
        description="GitHub Polling Agent - Check for merged PRs and create Notion pages"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Polling interval in seconds (default: 60)"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run once and exit (don't loop)"
    )

    args = parser.parse_args()

    # Validate configuration
    if not Settings.GITHUB_REPO_OWNER or not Settings.GITHUB_REPO_NAME:
        logger.error("❌ GITHUB_REPO_OWNER and GITHUB_REPO_NAME must be configured in .env")
        sys.exit(1)

    if not Settings.NOTION_DATABASE_ID:
        logger.error("❌ NOTION_DATABASE_ID must be configured in .env")
        sys.exit(1)

    if not Settings.SCALEKIT_DEFAULT_IDENTIFIER:
        logger.error("❌ SCALEKIT_DEFAULT_IDENTIFIER must be configured in .env")
        sys.exit(1)

    # Create and run agent
    agent = PollingAgent(interval=args.interval)

    if args.once:
        logger.info("🎯 Running single poll cycle...")
        agent.poll_once()
        logger.info("✅ Done!")
    else:
        agent.run()


if __name__ == "__main__":
    main()
