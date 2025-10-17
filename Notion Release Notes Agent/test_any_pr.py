"""
test_any_pr.py - Generic PR webhook simulator

Test any PR from your repo without ngrok!
Just provide the PR number and details.

Usage:
    python test_any_pr.py
"""
import hashlib
import hmac
import json
import os
import sys

import requests
from dotenv import load_dotenv

from settings import Settings

# Load environment variables
load_dotenv()


def get_pr_details():
    """Get PR details from user input"""
    print("=" * 60)
    print("🚀 GitHub PR → Notion Release Notes Simulator")
    print("=" * 60)
    print()
    print("Enter your PR details:")
    print()

    pr_number = input("PR Number [7]: ").strip() or "7"
    pr_title = input("PR Title: ").strip() or f"PR #{pr_number}"

    print()
    print("PR Description (enter multiple lines, empty line to finish):")
    print("---")
    body_lines = []
    while True:
        line = input()
        if line == "":
            break
        body_lines.append(line)

    pr_body = "\n".join(body_lines) or f"Release notes for PR #{pr_number}"

    return pr_number, pr_title, pr_body



def send_webhook(pr_number, pr_title, pr_body):
    """Send simulated webhook to local server"""

    owner = Settings.GITHUB_REPO_OWNER or "your-owner"
    repo_name = Settings.GITHUB_REPO_NAME or "your-repo"
    server_base = f"http://localhost:{Settings.FLASK_PORT}"

    payload = {
        "action": "closed",
        "number": int(pr_number),
        "pull_request": {
            "number": int(pr_number),
            "title": pr_title,
            "body": pr_body,
            "state": "closed",
            "merged": True,
            "merge_commit_sha": f"simulated_{pr_number}_{hash(pr_title) % 100000}",
            "html_url": f"https://github.com/{owner}/{repo_name}/pull/{pr_number}",
            "user": {
                "login": owner
            },
            "head": {
                "ref": f"feature/pr-{pr_number}",
                "sha": f"head_{pr_number}"
            },
            "base": {
                "ref": "main",
                "sha": f"base_{pr_number}"
            }
        },
        "repository": {
            "name": repo_name,
            "full_name": f"{owner}/{repo_name}",
            "owner": {
                "login": owner
            }
        }
    }

    print("=" * 60)
    print(f"📡 Sending webhook for PR #{pr_number}...")
    print(f"📝 Title: {pr_title}")
    print(f"🔗 URL: https://github.com/{owner}/{repo_name}/pull/{pr_number}")
    print("=" * 60)
    print()

    # Generate GitHub signature
    payload_bytes = json.dumps(payload).encode('utf-8')
    secret = os.getenv('GITHUB_WEBHOOK_SECRET', '').encode('utf-8')

    if secret:
        signature = 'sha256=' + hmac.new(secret, payload_bytes, hashlib.sha256).hexdigest()
        print("🔐 Using signature from GITHUB_WEBHOOK_SECRET")
    else:
        signature = ''
        print("⚠️  No GITHUB_WEBHOOK_SECRET found in .env")

    try:
        response = requests.post(
            f"{server_base}/webhook/github",
            data=payload_bytes,  # Send as bytes, not json=payload
            headers=(lambda h: (h.update({"X-Hub-Signature-256": signature}) or h) if signature else h)({
                "X-GitHub-Event": "pull_request",
                "Content-Type": "application/json",
            }),
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS!")
            print()
            print(f"📄 Notion Page: {result.get('notion_url', 'N/A')}")
            chan = os.getenv("SLACK_ANNOUNCE_CHANNEL", "N/A")
            print(f"💬 Slack: Notification sent to {chan}")
            print()
            print("=" * 60)
            print("🎉 Release notes created successfully!")
            print("=" * 60)
            print()
            return True
        else:
            print(f"❌ Error Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to webhook server!")
        print()
        print("Make sure webhook_server.py is running:")
        print("  .venv\\Scripts\\python.exe webhook_server.py")
        print()
        return False
    except requests.RequestException as e:
        print(f"❌ ERROR: {e}")
        return False


def main():
    """Main function"""
    # Check if server is running

    try:
        response = requests.get(f"http://localhost:{Settings.FLASK_PORT}/health", timeout=2)
        if response.status_code != 200:
            print("⚠️  Server is running but /health check failed")
    except Exception:
        print()
        print("❌ Webhook server is NOT running!")
        print()
        print("Please start it first:")
        print("  .venv\\Scripts\\python.exe webhook_server.py")
        print()
        sys.exit(1)

    # Get PR details and send webhook
    pr_number, pr_title, pr_body = get_pr_details()
    send_webhook(pr_number, pr_title, pr_body)


if __name__ == "__main__":
    main()
