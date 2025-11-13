"""
Optional custom summarizer hook for the Salesforce → Slack digest.

By default, the agent posts a deterministic text digest without any LLM.
If you want a one-liner summary at the top (e.g., using your own LLM/API),
implement the function below and return a short string. If you return None,
nothing extra is added.

Inputs:
- accounts: List[dict] of changed Accounts within the window
- opportunities: List[dict] of changed Opportunities within the window

Return:
- str | None — short summary to prepend in Slack, or None to skip

Example (pseudo-LLM):
    def summarize_digest(accounts, opportunities):
        context = {
            "accounts": [{"Name": a.get("Name"), "Id": a.get("Id")} for a in accounts],
            "opps": [{"Name": o.get("Name"), "Amount": o.get("Amount")} for o in opportunities],
        }
        # call_your_llm(context) -> "3 accounts changed; 5 opps with $420k in pipeline; next close 2025-11-01"
        return my_summary_string

Security tip:
- Redaction is applied elsewhere to known text fields, but ensure you don't
  send sensitive org data to external services unless you intend to.
"""
from typing import List, Dict, Optional


def summarize_digest(accounts: List[Dict], opportunities: List[Dict]) -> Optional[str]:
    """Return a short, user-defined summary string or None.

    This placeholder returns None by default (no custom summary).
    Edit this function to add your own logic or LLM call.
    """
    # Example trivial summary (disabled by default):
    # n_acc = len(accounts)
    # n_opp = len(opportunities)
    # return f"{n_acc} accounts changed; {n_opp} opportunities updated"
    return None
