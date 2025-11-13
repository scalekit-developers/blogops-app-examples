"""
Salesforce → Slack Customer 360 Insights (Scalekit)
- Pull Accounts & Opportunities updated in the last N hours (default 24)
- Redact PII
- Post concise Slack summary with deep links
- Uses Scalekit tools: salesforce_limits_get, salesforce_soql_execute, slack_send_message
"""

import json
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from settings import Settings
from sk_connectors import get_connector
from sf_utils import load_snapshot, save_snapshot, redact_pii
# Optional custom summarizer hook (user-editable)
try:
    from custom_summarizer import summarize_digest  # type: ignore
except Exception:
    summarize_digest = None
# Note: Block Kit helpers removed; using text-only formatting with deep links

# ---- Helpers ----

def _iso_hours_back(hours: int) -> str:
    end = datetime.now(timezone.utc)
    start = end - timedelta(hours=hours)
    # SOQL expects yyyy-mm-ddThh:mm:ssZ style ISO
    return start.strftime("%Y-%m-%dT%H:%M:%SZ"), end.strftime("%Y-%m-%dT%H:%M:%SZ")

def _link(domain: str, sobject: str, record_id: str) -> Optional[str]:
    if not domain or not record_id:
        return None
    # Lightning deep link
    return f"https://{domain}/lightning/r/{sobject}/{record_id}/view"

def _num(v) -> str:
    try:
        f = float(v)
        return f"{f:,.0f}"
    except Exception:
        return str(v) if v is not None else ""

def _get(data: Dict[str, Any], *path, default=None):
    cur = data
    for p in path:
        if isinstance(cur, dict) and p in cur:
            cur = cur[p]
        else:
            return default
    return cur

def _amount_sum(opps: List[Dict[str, Any]]) -> float:
    total = 0.0
    for o in opps:
        try:
            v = float(o.get("Amount") or 0)
            total += v
        except Exception:
            continue
    return total

def _first_non_empty(*vals) -> str:
    for v in vals:
        if v:
            return v
    return ""

def summarize_opps(opps: List[Dict[str, Any]]) -> str:
    """Deterministic one-liner summary for a set of opportunities."""
    if not opps:
        return "No recent opportunity activity."

    n = len(opps)
    won = [o for o in opps if (o.get("StageName") or "").lower() == "closed won"]
    won_count = len(won)
    won_total = _amount_sum(won)

    # Nearest upcoming close among non-won
    open_opps = [o for o in opps if (o.get("StageName") or "").lower() != "closed won"]
    def _parse_date(s: str):
        try:
            # Expecting YYYY-MM-DD
            return datetime.strptime(s, "%Y-%m-%d")
        except Exception:
            return None
    open_sorted = sorted(
        [o for o in open_opps if o.get("CloseDate")],
        key=lambda x: (_parse_date(x.get("CloseDate")) or datetime.max)
    )
    nearest = open_sorted[0] if open_sorted else None

    # Largest by Amount
    biggest = None
    try:
        biggest = max(opps, key=lambda o: float(o.get("Amount") or 0))
    except Exception:
        biggest = None

    parts: List[str] = []
    parts.append(f"{n} opps")
    if won_count:
        parts.append(f"{won_count} Closed Won ${_num(won_total)}")
    if nearest:
        parts.append(
            f"next: `{nearest.get('StageName')}` closes {nearest.get('CloseDate')} (${_num(nearest.get('Amount'))})"
        )
    if biggest and biggest is not nearest:
        parts.append(f"largest: ${_num(biggest.get('Amount'))} ({_first_non_empty(biggest.get('Name'), 'opp')})")

    return "; ".join(parts)

# ---- Salesforce queries ----

def get_limits(conn, identifier: str) -> Dict[str, Any]:
    try:
        res = conn.execute_action_with_retry(
            identifier=identifier, tool="salesforce_limits_get", parameters={}
        )
        return res if isinstance(res, dict) else getattr(res, "data", {}) or {}
    except Exception:
        return {}

def soql(conn, identifier: str, query: str) -> List[Dict[str, Any]]:
    """Execute SOQL using tenant-compatible parameter shapes.

    Tries the exec_soql fallback chain so different backends (soql vs query param,
    alternate tool name) are supported.
    """
    res = exec_soql(conn, identifier, query)
    data = res if isinstance(res, dict) else getattr(res, "data", {}) or {}
    # Common shapes observed: { records: [...] } or { result: [...] }
    return data.get("records") or data.get("result") or []

def fetch_accounts(conn, identifier: str, since_iso: str, until_iso: str, limit: int) -> List[Dict[str, Any]]:
    fields = [
        "Id","Name","Industry","AnnualRevenue","Owner.Email","Owner.Name","LastModifiedDate","Website","Phone","BillingCountry"
    ]
    q = f"""
SELECT {", ".join(fields)}
FROM Account
WHERE LastModifiedDate >= {since_iso} AND LastModifiedDate <= {until_iso}
ORDER BY LastModifiedDate DESC
LIMIT {limit}
"""
    return soql(conn, identifier, q)

def fetch_opps(conn, identifier: str, since_iso: str, until_iso: str, limit: int) -> List[Dict[str, Any]]:
    fields = [
        "Id","Name","Amount","StageName","CloseDate","AccountId","Account.Name","Owner.Email","Owner.Name","LastModifiedDate"
    ]
    q = f"""
SELECT {", ".join(fields)}
FROM Opportunity
WHERE IsDeleted = false AND LastModifiedDate >= {since_iso} AND LastModifiedDate <= {until_iso}
ORDER BY LastModifiedDate DESC
LIMIT {limit}
"""
    return soql(conn, identifier, q)

# ---- Formatting (text-only) & Redaction ----

def _opp_line_text(name: str, url: Optional[str], stage: str, amount: str, close: str) -> str:
    link = f"<{url}|{name}>" if url else f"*{name}*"
    bits = [link]
    if stage: bits.append(f"`{stage}`")
    if amount: bits.append(f"${amount}")
    if close: bits.append(f"closes {close}")
    return " • " + "  |  ".join(bits)

def build_text_fallback(
    domain: str,
    accts: List[Dict[str, Any]],
    opps: List[Dict[str, Any]],
    lookback_hours: int = 24,
    summary_text: Optional[str] = None,
) -> str:
    """Plaintext digest with deep links.

    Shows all changed accounts with their related opportunities; if no accounts changed,
    shows all changed opportunities.
    """
    header = f"📊 Customer 360 Insights — updated in last {lookback_hours}h"
    lines: List[str] = []

    # Optional summary (from custom hook). If not provided and there are only opps,
    # we add a deterministic summary of opps as a fallback.
    if summary_text:
        lines.append(f"*Summary:* {summary_text}")

    # Prefer all touched accounts with their related opportunities
    if accts:
        for acc in accts:
            acc_id = acc.get("Id")
            acc_name = acc.get("Name") or "Account"
            a_url = _link(domain, "Account", acc_id)
            title = f"*{acc_name}*" + (f"  <{a_url}|Open>" if a_url else "")
            lines.append(title)
            # find opps for this account
            related = [o for o in opps if (o.get("AccountId") or "") == acc_id]
            for o in related:
                o_url = _link(domain, "Opportunity", o.get("Id"))
                lines.append(_opp_line_text(
                    name=o.get("Name") or "Opportunity",
                    url=o_url,
                    stage=o.get("StageName") or "",
                    amount=_num(o.get("Amount")),
                    close=o.get("CloseDate") or "",
                ))
    elif opps:
        # Otherwise, show all changed opps
        if not summary_text:
            summary = summarize_opps(opps)
            lines.append(f"*Summary:* {summary}")
        for o in opps:
            o_url = _link(domain, "Opportunity", o.get("Id"))
            lines.append(_opp_line_text(
                name=o.get("Name") or "Opportunity",
                url=o_url,
                stage=o.get("StageName") or "",
                amount=_num(o.get("Amount")),
                close=o.get("CloseDate") or "",
            ))

    if lines:
        return header + "\n" + "\n".join(lines)
    return header

# ---- Slack ----

def post_slack(conn, identifier: str, channel: str, text: str, blocks: Optional[List[Dict]] = None):
    params = {"channel": channel, "text": text}
    if blocks:
        params["blocks"] = blocks
    res = conn.execute_action_with_retry(
        identifier=identifier, tool="slack_send_message", parameters=params
    )
    return res if isinstance(res, dict) else getattr(res, "data", {}) or {}

# Note: Chunked block posting removed — we post text-only messages.

def exec_soql(connector, sf_identifier: str, soql: str) -> dict | None:
    """
    Execute a SOQL query using whichever tool/param shape this tenant supports.

    Try order:
      1) salesforce_soql_execute with {"soql": "..."}
      2) salesforce_soql_execute with {"query": "..."}   (fallback)
      3) salesforce_query_soql with {"query": "..."}     (alternate tool)
    Returns dict result or None.
    """
    # Prefer the alternate tool first for tenants that only support it.
    res = connector.execute_action_with_retry(
        identifier=sf_identifier,
        tool="salesforce_query_soql",
        parameters={"query": soql},
    )
    if res:
        return res

    # Fallbacks: salesforce_soql_execute with different param shapes
    res = connector.execute_action_with_retry(
        identifier=sf_identifier,
        tool="salesforce_soql_execute",
        parameters={"soql": soql},
    )
    if res:
        return res

    res = connector.execute_action_with_retry(
        identifier=sf_identifier,
        tool="salesforce_soql_execute",
        parameters={"query": soql},
    )
    return res


# ---- Main workflow ----

def run_customer_360():
    from datetime import timedelta
    print("🚀 Starting Salesforce → Slack Customer 360 Insights")

    # Connectors
    conn = get_connector()

    # Validate connections or emit OAuth URLs
    if not conn.is_service_connected("salesforce", Settings.SALESFORCE_IDENTIFIER):
        url = conn.get_authorization_url("salesforce", Settings.SALESFORCE_IDENTIFIER)
        print("❌ Salesforce not connected. Authorize:", url)
        return
    if not conn.is_service_connected("slack", Settings.SLACK_IDENTIFIER):
        url = conn.get_authorization_url("slack", Settings.SLACK_IDENTIFIER)
        print("❌ Slack not connected. Authorize:", url)
        return

    # Governor limits snapshot (informational)
    limits = get_limits(conn, Settings.SALESFORCE_IDENTIFIER)
    rem = limits.get("DailyApiRequests", {}).get("Remaining") if isinstance(limits, dict) else None
    if rem is not None:
        print(f"📉 Salesforce API Remaining (est): {rem}")

    # Time window
    since_iso, until_iso = _iso_hours_back(Settings.LOOKBACK_HOURS)
    print(f"⏱️  Window: {since_iso} → {until_iso}")

    # Fetch Accounts & Opportunities (limit can be tuned in Settings or here)
    accts = fetch_accounts(
        conn,
        Settings.SALESFORCE_IDENTIFIER,
        since_iso,
        until_iso,
        limit=200,
    )
    opps = fetch_opps(
        conn,
        Settings.SALESFORCE_IDENTIFIER,
        since_iso,
        until_iso,
        limit=200,
    )


    # Redact PII in-place for fields that may carry email/phone fragments
    if Settings.REDACT_EMAILS or Settings.REDACT_PHONES:
        for a in accts:
            for k in ("Phone", "Website", "Name"):
                if a.get(k) and isinstance(a[k], str):
                    a[k] = redact_pii(a[k], Settings.REDACT_EMAILS, Settings.REDACT_PHONES)
        for o in opps:
            for k in ("Name",):
                if o.get(k) and isinstance(o[k], str):
                    o[k] = redact_pii(o[k], Settings.REDACT_EMAILS, Settings.REDACT_PHONES)

    # (Optional) Delta with snapshot (only announce newly changed since last run)
    snapshot_path = Settings.SF_SNAPSHOT_FILE
    prev = load_snapshot(snapshot_path)
    cur  = {}
    changed_accts, changed_opps = [], []

    def _lastmod(x): return x.get("LastModifiedDate") or ""
    for a in accts:
        aid = a.get("Id"); lm = _lastmod(a)
        if not aid: continue
        cur[f"A:{aid}"] = lm
        if prev.get(f"A:{aid}") != lm:
            changed_accts.append(a)
    for o in opps:
        oid = o.get("Id"); lm = _lastmod(o)
        if not oid: continue
        cur[f"O:{oid}"] = lm
        if prev.get(f"O:{oid}") != lm:
            changed_opps.append(o)

    save_snapshot(snapshot_path, cur)

    # If no changes, still inform Slack (optional)
    if not changed_accts and not changed_opps:
        print("📭 No new or updated records in window.")
        if Settings.DIGEST_CHANNEL_ID:
            post_slack(
                conn, Settings.SLACK_IDENTIFIER, Settings.DIGEST_CHANNEL_ID,
                text=f"📊 Customer 360: No new/updated Accounts or Opportunities in last {Settings.LOOKBACK_HOURS}h."
            )
        return

    # Prepare domain for deep links
    domain = Settings.SALESFORCE_DOMAIN or ""

    # Optional user-provided summary hook
    summary_text = None
    if summarize_digest:
        try:
            summary_text = summarize_digest(changed_accts, changed_opps)
        except Exception as e:
            print(f"⚠️  Custom summarizer failed: {e}")

    # Post (text-only). Text includes a compact summary with deep links.
    if Settings.DIGEST_CHANNEL_ID:
        txt = build_text_fallback(
            domain,
            changed_accts,
            changed_opps,
            lookback_hours=Settings.LOOKBACK_HOURS,
            summary_text=summary_text,
        )
        res = post_slack(conn, Settings.SLACK_IDENTIFIER, Settings.DIGEST_CHANNEL_ID, text=txt, blocks=None)
        ch = (res or {}).get("channel")
        ts = (res or {}).get("ts") or (res or {}).get("timestamp")
        meta = {"channel": ch, "ts": ts}
        print("✅ Posted to Slack:", json.dumps(meta, indent=2))
    else:
        print("ℹ️ DIGEST_CHANNEL_ID not set; printing text message:")
        print(txt)

if __name__ == "__main__":
    run_customer_360()
