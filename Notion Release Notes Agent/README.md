# GitHub → Notion Release Notes Agent

Automatically creates Notion pages with release notes when you merge PRs on GitHub.

## How It Works

1. You merge a PR on GitHub
2. Agent detects the merge (polls every 60 seconds)
3. Creates a Notion page with PR details
4. Sends Slack notification with the link

**No webhooks, no tunnels, no cloud deployment needed.** Just run it locally.

---

## Setup Guide

### Step 1: GitHub OAuth App

Create a GitHub OAuth app to allow Scalekit to access your repositories:

1. Go to **GitHub Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. Fill in:
   - **Application name:** Scalekit Agent
   - **Homepage URL:** <https://hey.scalekit.dev>
   - **Authorization callback URL:** <https://hey.scalekit.dev/oauth/callback>
3. Click **Register application**
4. Copy the **Client ID** and generate a **Client Secret**
5. Add these to Scalekit:
   - Go to <https://hey.scalekit.dev>
   - Navigate to **Connections** → **GitHub**
   - Add your Client ID and Client Secret

### Step 2: Slack Workspace Setup

Connect your Slack workspace to Scalekit:

1. Get your **Slack Workspace ID**:
   - Open Slack in browser
   - Your workspace ID is in the URL: `https://app.slack.com/client/T01234567/...`
   - `T01234567` is your workspace ID
2. Install Scalekit app in Slack:
   - Go to <https://hey.scalekit.dev>
   - Navigate to **Connections** → **Slack**
   - Click **Add to Slack** and authorize
3. Get your **Slack Channel ID**:
   - Open the channel in Slack
   - Click channel name → scroll down
   - Copy the Channel ID (e.g., `C01234567`)

### Step 3: Notion Database Setup

Create a Notion database with the required structure:

1. Open Notion and create a new **Database** (Table view)
2. Add these properties (exact names matter):
   - **Name** - Title (default)
   - **PR SHA** - Text
   - **PR Number** - Number
   - **Repository** - Text
   - **Status** - Select (add option: "Merged")
   - **Summary** - Text (optional)
3. Get your **Database ID**:
   - Open the database as a full page
   - Copy from URL: `https://notion.so/your-workspace/{DATABASE_ID}?v=...`
   - The 32-character hex string is your database ID
4. Share the database:
   - Click **Share** → **Invite** → Add your Scalekit email
   - Or make it accessible to your workspace

### Step 4: Configure User Mapping

Map Slack users to their identities:

1. Copy the example file:

   ```bash
   copy user_mapping.example.json user_mapping.json
   ```

2. Get Slack User IDs:
   - In Slack, click on a user's profile
   - Click **More (⋯)** → **Copy member ID**
   - This gives you the user ID (e.g., `U09JQLLKKMH`)

3. Edit `user_mapping.json`:

   ```json
   {
     "U09JQLLKKMH": {
       "scalekit_identifier": "your@email.com",
       "github_username": "your-github-username"
     }
   }
   ```

   - **Key:** Slack User ID (U-prefixed)
   - **scalekit_identifier:** Email used in Scalekit
   - **github_username:** Your GitHub username

**Why user mapping?** The agent needs to know which Scalekit account to use when posting Slack messages. Each Slack user must have a corresponding Scalekit identifier.

---

## Quick Start

### 1. Install Dependencies

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```env
# Scalekit (handles all OAuth for GitHub, Notion, Slack)
SCALEKIT_ENV_URL=https://hey.scalekit.dev
SCALEKIT_CLIENT_ID=your_client_id
SCALEKIT_CLIENT_SECRET=your_client_secret
SCALEKIT_DEFAULT_IDENTIFIER=your@email.com

# GitHub
GITHUB_REPO_OWNER=your-username
GITHUB_REPO_NAME=your-repo

# Notion
NOTION_DATABASE_ID=your_notion_database_id

# Slack
SLACK_ANNOUNCE_CHANNEL=C01234567
```

### 3. Authorize Services

Start the webhook server:

```bash
python webhook_server.py
```

Open <http://localhost:3000/auth> in your browser and authorize Slack and Notion.

### 4. Run

```bash
python polling_server.py
```

**Done!** Merge a PR on GitHub and watch the Notion page appear within 60 seconds.

---

## Testing

Test without merging a real PR:

```bash
python test_any_pr.py
```

Enter PR details when prompted. Creates a real Notion page and sends Slack notification.

---

## Two Ways to Run

### Option 1: Polling (Recommended)

**Pros:** Works on localhost, no setup needed, no webhooks/tunnels

**Cons:** 60-second delay

```bash
python polling_server.py
```

### Option 2: Webhooks

**Pros:** Instant notifications

**Cons:** Needs public URL (tunnel or cloud deployment)

```bash
python webhook_server.py
# Then use cloudflared or deploy to cloud
```

---

## How Polling Works

1. Checks GitHub every 60 seconds for merged PRs
2. Saves state in `polling_state.json` (prevents duplicates)
3. Processes only new PRs since last check
4. Creates Notion page with PR title, description, SHA, link
5. Sends Slack notification to configured channel

**State tracking:** Restart the server anytime - it won't reprocess old PRs.

---

## Project Structure

```
├── polling_server.py       # Main server (polls GitHub every 60s)
├── webhook_server.py       # Alternative: webhook server (needs tunnel)
├── notion_service.py       # Creates Notion pages
├── sk_connectors.py        # Scalekit integration
├── settings.py             # Config loader
├── test_any_pr.py          # Test script
├── .env                    # Your config
└── user_mapping.json       # User → Scalekit mappings
```

---

## Customization

**Change polling interval:**

```bash
python polling_server.py --interval 30  # Check every 30 seconds
```

**Reprocess old PRs:**

```bash
rm polling_state.json
python polling_server.py --once  # Reprocess last 24 hours
```

---

## Troubleshooting

**No PRs detected:**

- Check `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` in `.env`
- PRs must be merged (not just closed)
- PRs must be within last 24 hours

**Notion page not created:**

- Check `NOTION_DATABASE_ID` in `.env`
- Visit <http://localhost:3000/auth> to re-authorize Notion

**Slack notification not sent:**

- Check `SLACK_ANNOUNCE_CHANNEL` in `.env`
- Visit <http://localhost:3000/auth> to re-authorize Slack

**"token_expired" error:**

- OAuth token expired, re-authorize at <http://localhost:3000/auth>

---

## Requirements

- Python 3.11+
- Scalekit account (<https://hey.scalekit.dev>)
- GitHub repository
- Notion database
- Slack workspace
