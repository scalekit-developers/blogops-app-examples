# Slack Triage Agent (Scalekit + LangGraph)

![Slack Triage Agent](assets/Slack%20Triage%20Agent.png)

## Get Started (5 steps)

1. Create a virtual environment and install deps

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Optional (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Create .env from the example and fill the required values

```env
# Required
SCALEKIT_ENV_URL=https://hey.scalekit.dev
SCALEKIT_CLIENT_ID=your_client_id
SCALEKIT_CLIENT_SECRET=your_client_secret
ALLOWED_CHANNELS=C09JTJWN0R3     # Comma-separated Slack channel IDs

# GitHub repo to create issues in
GITHUB_REPO_OWNER=your_github_username
GITHUB_REPO_NAME=your_repo

# Optional
POLL_INTERVAL_SECONDS=30
POLL_LOOKBACK_SECONDS=86400
```

3. Map your Slack user to a Scalekit identifier (copy the example first)

```bash
cp user_mapping.example.json user_mapping.json
```

Then edit `user_mapping.json`:

```json
{
  "U01234567": {
    "scalekit_identifier": "you@company.com",
    "github_username": "your-github"
  }
}
```

4. Start the agent

```bash
python main_polling.py
```

5. Authorize Slack and GitHub (replace with your Slack user ID)

```text
http://localhost:5000/auth/init?user_id=YOUR_SLACK_USER_ID&service=slack
http://localhost:5000/auth/init?user_id=YOUR_SLACK_USER_ID&service=github
```

Tip: YOUR_SLACK_USER_ID is the key you used in user_mapping.json (e.g., U01234567).

### What is YOUR_SLACK_USER_ID?

- It's your Slack Member ID, a string like `U01234567`. In this project, it's the key in `user_mapping.json`.
- How to find it:
  - Slack desktop: Open your profile → three dots (More) → Copy member ID.
  - Or right‑click your name in a message → View profile → three dots → Copy member ID.
  - It will be used in the OAuth URLs and as the key in `user_mapping.json`.

Then post in Slack:

```text
bug: The login page is broken
```

The agent will create a GitHub issue and reply in Slack with a confirmation.

## How it works (short)

- `main_polling.py` polls Slack via Scalekit, filters bot/duplicate messages
- `routing.py` decides: GitHub issue, Zendesk ticket (placeholder), or ignore (keyword-based)
- `actions.py` performs actions (GitHub issue, Slack confirmation)
- `sk_connectors.py` wraps Scalekit API calls with retries

Note: Zendesk is currently not supported in Scalekit for this app. Routing includes a Zendesk placeholder but only GitHub is executed.

Keywords (edit in `settings.py`):

```python
GITHUB_KEYWORDS = ["bug", "error", "github:", "issue:", "broken", "crash", "exception"]
ZENDESK_KEYWORDS = ["support", "help", "zendesk:", "ticket:", "customer", "billing", "question"]  # placeholder
```

## Files at a glance

- `main_polling.py` – polling loop and OAuth endpoints
- `routing.py` – LangGraph workflow for analyze → execute → confirm
- `actions.py` – GitHub issue creation + Slack confirmations
- `sk_connectors.py` – Scalekit client + retries + connection checks
- `settings.py` – config, channel lists, keywords, polling intervals
- `user_mapping.json` – Slack user → {scalekit identifier, github username}

## Quick troubleshooting

- No messages fetched → authorize Slack using the URL above
- GitHub issue fails → check repo owner/name and GitHub authorization
- "User not mapped" → add your Slack user to `user_mapping.json`

**Learn more:**

- [Scalekit Blog for this project](https://www.scalekit.com/blog)
- [Agent Actions Quickstart Docs](https://docs.scalekit.com/agent-actions/quickstart/)
