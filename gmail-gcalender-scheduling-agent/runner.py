# runner.py
from sk_connectors import get_connector
from gmail_api import fetch_emails, get_message
from calendar_api import list_calendars, list_events, create_event
from parsers import parse_entities
from slotting import derive_busy, suggest_slots, human_slot
import os, pytz
from datetime import datetime, timedelta
# runner.py (add these near the top)
import base64

def _headers_dict(message):
    """Flatten Gmail payload.headers into a case-sensitive dict."""
    hdrs = {}
    payload = message.get("payload") or {}
    for h in payload.get("headers", []):
        if isinstance(h, dict):
            name = h.get("name")
            value = h.get("value")
            if name:
                hdrs[name] = value
    return hdrs

def _subject_from_message(message):
    hdrs = _headers_dict(message)
    # Prefer canonical case, then lowercase, then any top-level field
    return (
        hdrs.get("Subject")
        or hdrs.get("subject")
        or message.get("subject")
        or "(no subject)"
    )


USER_TZ = os.getenv("USER_DEFAULT_TZ", "Asia/Kolkata")
LOCAL_TZ = pytz.timezone(USER_TZ)
WORK_START_LOCAL = os.getenv("WORK_START_LOCAL", "10:00")
WORK_END_LOCAL = os.getenv("WORK_END_LOCAL", "18:00")
DEFAULT_DURATION_MIN = int(os.getenv("DEFAULT_DURATION_MIN", "30"))
BUFFER_MIN = int(os.getenv("BUFFER_MIN", "10"))

def hm_to_time(hm):
    h, m = hm.split(":"); from datetime import time as dtime; return dtime(int(h), int(m))
def iso(dt): return dt.replace(microsecond=0).isoformat()

# runner.py (only replace main(); keep your imports/constants)

def _try_queries(connector, identifier, max_results=10):
    # Invite-focused search (provider-agnostic, must have .ics)
    queries = [
    'in:anywhere newer_than:30d '
    '(subject:("Invitation:" OR "Updated invitation:" OR "Rescheduled") '
    'OR body:("When" OR "Date" OR "Time" OR "Join with Google Meet")) '
    'has:attachment filename:ics'
    ]

    from gmail_api import fetch_emails
    for q in queries:
        msgs = fetch_emails(identifier, q, max_results=max_results) or []
        if msgs:
            print(f"[gmail] matched {len(msgs)} msg(s) for query:\n  {q}")
            peek = []
            for m in msgs[:5]:
                sub = None
                hdrs = (m.get("payload") or {}).get("headers", [])
                if isinstance(hdrs, list):
                    d = {h.get("name"): h.get("value") for h in hdrs if isinstance(h, dict)}
                    sub = d.get("Subject") or d.get("subject")
                peek.append(sub or m.get("snippet") or "(no subject)")
            if peek:
                print("Top subjects:")
                for s in peek:
                    print("  -", s[:120])
            return msgs
        else:
            print(f"[gmail] no hits for query:\n  {q}")
    return []


def _pick_newest_with_id(msgs):
    def _id(m): return m.get("id") or m.get("messageId")
    msgs = [m for m in msgs if _id(m)]
    if not msgs:
        return None
    def _ts(m):
        try:
            return int(m.get("internalDate", "0"))
        except Exception:
            return 0
    msgs.sort(key=_ts, reverse=True)
    return msgs[0]

# runner.py (replace your main() with this version)

def main():
    connector = get_connector()
    identifier = connector.get_user_identifier()
    if not identifier:
        print("Set SCALEKIT_IDENTIFIER in .env")
        return

    print("Identifier:", identifier)
    print("If you haven't already, auth via:\n  http://localhost:5001/auth/init?service=gmail\n  http://localhost:5001/auth/init?service=googlecalendar")

    # 1) Gmail search
    msgs = _try_queries(connector, identifier, max_results=10)
    if not msgs:
        print("No candidate emails found by progressive search.")
        print("Tip: send yourself a real Google Calendar invite (From: calendar-notification@google.com, Subject starts with 'Invitation:').")
        return

    # 2) choose newest message
    chosen = _pick_newest_with_id(msgs)
    if not chosen:
        print("Messages returned, but none had an id/messageId.")
        return
    msg_id = chosen.get("id") or chosen.get("messageId")
    print(f"Chosen message id: {msg_id}")

    # 3) fetch full message & parse
    full = get_message(identifier, msg_id) or {}   # <-- you were missing this line
    subject = _subject_from_message(full)
    if not full:
        print("Failed to fetch full message (check Gmail auth/permissions).")
        return
    headers = _headers_dict(full)
    body = full.get("snippet") or ""               # fine for quick parsing
    print(f"Subject: {subject or '(none)'}")

    ent = parse_entities(subject, body, headers, user_tz=USER_TZ, default_duration=DEFAULT_DURATION_MIN)

    # 4) calendar selection
    cals = list_calendars(identifier) or []
    if not cals:
        print("No calendars accessible — authorize Google Calendar.")
        return
    cal_id = next((c.get("id") for c in cals if str(c.get("primary")).lower() == "true" or c.get("id") == "primary"),
                  cals[0].get("id") or "primary")
    print("Using calendar:", cal_id)

    # 5) busy window & booking/suggestions
    now = datetime.now(LOCAL_TZ)
    time_min = iso(now + timedelta(days=1))
    time_max = iso(now + timedelta(days=7))
    events = list_events(identifier, cal_id, time_min, time_max) or []
    busy = derive_busy(events, LOCAL_TZ)

    if ent.hard_start:
        payload = {
            "calendarId": cal_id,
            "summary": ent.title,
            "description": f"Scheduled from email (message_id={msg_id}).",
            "start": {"dateTime": iso(ent.hard_start.astimezone(LOCAL_TZ)), "timeZone": USER_TZ},
            "end":   {"dateTime": iso((ent.hard_end or ent.hard_start).astimezone(LOCAL_TZ)), "timeZone": USER_TZ},
            "attendees": [a.dict() for a in ent.attendees],
            # If your connector supports creating Meet links, keep conferenceData.
            # If not, comment out the next line.
            "conferenceData": {"createRequest": {"requestId": f"req-{int(now.timestamp())}"}},
            "sendUpdates": "all",
        }
        created = create_event(identifier, cal_id, payload)
        if created:
            print("✅ BOOKED:", created)
        else:
            print("❌ Failed to create event.")
    else:
        slots = suggest_slots(
            busy=busy, now_local=now,
            work_start=hm_to_time(WORK_START_LOCAL),
            work_end=hm_to_time(WORK_END_LOCAL),
            duration_min=ent.duration_minutes,
            buffer_min=BUFFER_MIN,
            days_ahead=7, limit=3
        )
        if not slots:
            print("No free slots next 7 business days.")
        else:
            print("PROPOSE:")
            for s in slots:
                print("-", human_slot(s, USER_TZ))


if __name__ == "__main__":
    main()
