# Salesforce‑Backed Customer 360 Insights Agent (Python)

Pull key Account/Opportunity signals from Salesforce, create concise insights, and post to Slack with deep links. This project uses ScaleKit connectors for Salesforce and Slack. Messages are posted as a single text digest with deep links (no Block Kit required), so they render consistently across clients and previews.

## Quick Start

1) Create and activate a virtual environment, then install dependencies
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

2) Create your env file
```bash
cp .env.example .env
# Edit .env with your ScaleKit, Salesforce, and Slack identifiers
```

3) Run the agent
```bash
python sf_customer_360.py
```

You should see a text digest posted in your Slack channel with deep links to Accounts and Opportunities.

## How it works

- Uses ScaleKit connectors to run SOQL queries (Salesforce) and send a message (Slack).
- Looks back N hours (configurable) for recently changed Accounts and Opportunities.
- Produces a concise, plaintext digest:
   - Each changed Account is listed with an “Open” link to Salesforce.
   - Under each Account, all related changed Opportunities are listed with deep links, stage, amount, and close date.
   - If no Accounts changed, it lists all changed Opportunities with deep links.
- Redacts emails and phone numbers by default.
- Persists a lightweight snapshot so subsequent runs only include newly changed records.

Optional custom summary hook
- If you want a one-liner summary at the top (e.g., from your own LLM or rule-based code), edit `custom_summarizer.py` and implement `summarize_digest(accounts, opportunities) -> str | None`.
- If the function returns a string, it will be prepended as “Summary: …” in the Slack message. If it returns `None` (default), nothing extra is added.

## Configuration (.env)

ScaleKit (required)
- SCALEKIT_ENV_URL — Base URL to your ScaleKit environment (e.g., https://hey.scalekit.dev)
- SCALEKIT_CLIENT_ID — ScaleKit client ID
- SCALEKIT_CLIENT_SECRET — ScaleKit client secret

Connected identities (required)
- SALESFORCE_IDENTIFIER — The identity (email) you used to authorize Salesforce in ScaleKit
- SLACK_IDENTIFIER — The identity (email) you used to authorize Slack in ScaleKit

Slack destination (required)
- DIGEST_CHANNEL_ID — Slack channel ID to post to (e.g., C0123456789)

Window and limits
- LOOKBACK_HOURS — How many hours back to scan (default: 24)
- MAX_RECORDS — Max records to fetch per object (default: 200)

Salesforce links (optional)
- SALESFORCE_DOMAIN — Your Lightning domain for deep links (no protocol), e.g., mydomain.lightning.force.com

Snapshot and redaction
- SF_SNAPSHOT_FILE — Local JSON file to store last-seen record timestamps (default: sf_insights_snapshot.json)
- REDACT_EMAILS — true|false (default true)
- REDACT_PHONES — true|false (default true)

## Example output (text digest)

```
Customer 360 Insights — updated in last 24h
*Edge Communications*  <https://your-domain/lightning/r/Account/001.../view|Open>
 • <https://your-domain/lightning/r/Opportunity/006.../view|New Generator>  |  `Prospecting`  |  $50,000  |  closes 2025-11-27
 • <https://your-domain/lightning/r/Opportunity/006.../view|Install Services>  |  `Closed Won`  |  $25,000  |  closes 2025-10-15

*Grand Hotels & Resorts Ltd*  <https://your-domain/lightning/r/Account/001.../view|Open>
 • <https://your-domain/lightning/r/Opportunity/006.../view|Kitchen Backup>  |  `Value Proposition`  |  $250,000  |  closes 2025-12-10
```

## Project structure

```
salesforce-backed-customer-insight-agent/
├─ .env.example
├─ .gitignore
├─ README.md
├─ requirements.txt
├─ settings.py
├─ sf_customer_360.py        # Main entrypoint (text-only Slack digest)
├─ sf_utils.py               # Snapshot, PII redaction helpers
└─ sk_connectors.py          # ScaleKit connector wrapper (Salesforce + Slack)
```

## SOQL and permissions

- The agent runs windowed SOQL for Account and Opportunity.
- It gracefully handles tenants that only support `salesforce_query_soql` and adjusts parameter shapes.
- Field-level security (FLS): If some fields aren’t visible for your user, simply remove them from the queries in code. The digest defaults to safe fields.

## Notes on limits and behavior

- Governor limits: A snapshot of remaining API limits is printed at run start for visibility.
- Snapshotting: The `sf_insights_snapshot.json` file is used to only report records changed since the prior run. Delete it if you want a full refresh.
- PII redaction: Emails/phones are masked by default. Links still work without exposing PII.

## Troubleshooting

- “Slack posted only a short text”: This project intentionally posts a single text message (no Block Kit) for consistent rendering across clients and previews.
- “No data found”: Increase `LOOKBACK_HOURS` or verify recent changes exist in your org.
- “Deep links not clickable or 404”: Ensure `SALESFORCE_DOMAIN` is set correctly (no protocol, Lightning domain).
- “Auth not connected”: The script prints authorization URLs if Salesforce/Slack aren’t connected in ScaleKit. Open them and complete OAuth once.

