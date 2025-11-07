# runner.py

from datetime import datetime, timedelta
import os
import time
import pytz
from sk_connectors import get_connector
from gmail_api import fetch_emails, get_message
from calendar_api import list_calendars, list_events, create_event
from parsers import parse_entities
from slotting import derive_busy, suggest_slots, human_slot, iso, overlaps

USER_TZ = os.getenv("USER_DEFAULT_TZ", "Asia/Kolkata")
LOCAL_TZ = pytz.timezone(USER_TZ)
WORK_START_LOCAL = os.getenv("WORK_START_LOCAL", "10:00")
WORK_END_LOCAL = os.getenv("WORK_END_LOCAL", "18:00")
DEFAULT_DURATION_MIN = int(os.getenv("DEFAULT_DURATION_MIN", "30"))
BUFFER_MIN = int(os.getenv("BUFFER_MIN", "10"))

def hm_to_time(hm: str):
    h, m = hm.split(":")
    return datetime.strptime(f"{h}:{m}", "%H:%M").time()

def _headers_dict(message):
    hdrs = {}
    payload = message.get("payload", {})
    for h in payload.get("headers", []):
        name = h.get("name")
        value = h.get("value")
        if name:
            hdrs[name] = value
    return hdrs

def _subject_from_message(message):
    hdrs = _headers_dict(message)
    return hdrs.get("Subject") or hdrs.get("subject") or message.get("subject") or "(no subject)"

def _try_queries(connector, identifier, max_results=10):
    # Only searching for meeting invites with .ics attachments
    q = ('in:anywhere newer_than:1d '
         '(subject:("Invitation:" OR "Updated invitation:" OR "Rescheduled") '
         'OR body:("When" OR "Date" OR "Time" OR "Join with Google Meet")) '
         'has:attachment filename:ics')
    return fetch_emails(identifier, q, max_results=max_results) or []

# Track processed event IDs
processed_event_ids = set()

def process_invitation(connector, identifier, msg):
    msg_id = msg.get("id") or msg.get("messageId")
    
    # Skip if the event has already been processed
    if msg_id in processed_event_ids:
        print(f"Event {msg_id} already processed; skipping.")
        return
    processed_event_ids.add(msg_id)

    # Parse the invitation email
    full = get_message(identifier, msg_id) or {}
    headers = _headers_dict(full)
    subject = _subject_from_message(full)
    body = full.get("snippet") or ""
    
    # Parse entities from the email (hard start, attendees, etc.)
    ent = parse_entities(subject, body, headers, user_tz=USER_TZ, default_duration=DEFAULT_DURATION_MIN)
    
    if not ent.hard_start:
        print(f"No hard date/time found in message {msg_id}; skipping.")
        return
    
    # Retrieve calendar events
    cals_resp = list_calendars(identifier) or {}
    cals = cals_resp.get("calendars", [])
    if not cals:
        print("No calendars accessible. Skip.")
        return
    
    cal_id = next((c.get("id") for c in cals if str(c.get("primary")).lower() == "true"), cals[0].get("id"))

    # Get existing events for conflict check
    now = datetime.now(LOCAL_TZ)
    time_min = iso(now)
    time_max = iso(now + timedelta(days=30))
    events_resp = list_events(identifier, cal_id, time_min, time_max) or {}
    events = events_resp.get('events', []) if isinstance(events_resp, dict) else events_resp
    
    # If no events, treat as no busy blocks
    if not events:
        busy = []
    else:
        busy = derive_busy(events, LOCAL_TZ)
    print("busy slots generated:", busy)
    
    # Propose event times
    proposed_start = ent.hard_start.astimezone(LOCAL_TZ)
    proposed_end = ent.hard_end.astimezone(LOCAL_TZ) if ent.hard_end else proposed_start + timedelta(minutes=ent.duration_minutes)
    
    conflict = False
    for b0, b1 in busy:
        if overlaps(proposed_start, proposed_end, b0, b1):
            print("Conflict detected!")
            conflict = True
            break
    
    if not conflict:
        # No conflict: create the event at the proposed time
        print(f"No conflict for {subject}; creating event at proposed time.")
        payload = {
            "calendarId": cal_id,
            "summary": ent.title,
            "description": f"Scheduled from email (message_id={msg_id}).",
            "start": {"dateTime": iso(proposed_start), "timeZone": USER_TZ},
            "end": {"dateTime": iso(proposed_end), "timeZone": USER_TZ},
            "attendees": [a.model_dump() for a in ent.attendees],
            "conferenceData": {"createRequest": {"requestId": f"req-{int(now.timestamp())}"}},
            "sendUpdates": "all"
        }
        resp = create_event(identifier, cal_id, payload)
        if "error" in resp:
            print("Failed to create event:", resp["error"])
        else:
            print("Event created at proposed time.")
            processed_event_ids.add(msg_id)
        return

    # Conflict exists: find available time slots
    print(f"Conflict for {subject}; proposing alternatives.")
    # Respect original meeting duration if available
    resched_duration_min = ent.duration_minutes
    try:
        if ent.hard_start and ent.hard_end:
            resched_duration_min = max(1, int((ent.hard_end - ent.hard_start).total_seconds() // 60))
    except Exception:
        pass
    free_slots = suggest_slots(
        busy=busy, now_local=now, 
        work_start=hm_to_time(WORK_START_LOCAL),
        work_end=hm_to_time(WORK_END_LOCAL),
        duration_min=resched_duration_min,
        buffer_min=BUFFER_MIN,
        days_ahead=7, limit=3
    )
    
    if not free_slots:
        print("No available slots in next week.")
        return

    # Choose first available slot and create event
    chosen_slot = free_slots[0]
    print(f"Proposed slot: {human_slot(chosen_slot, USER_TZ)}")

    payload = {
        "calendarId": cal_id,
        "summary": ent.title,
        "description": f"Rescheduled from email (message_id={msg_id}).",
        "start": {"dateTime": iso(chosen_slot[0]), "timeZone": USER_TZ},
        "end": {"dateTime": iso(chosen_slot[1]), "timeZone": USER_TZ},
        "attendees": [a.model_dump() for a in ent.attendees],
        "conferenceData": {"createRequest": {"requestId": f"req-{int(now.timestamp())}"}},
        "sendUpdates": "all"
    }

    resp = create_event(identifier, cal_id, payload)
    if "error" in resp:
        print("Failed to create event:", resp["error"])
    else:
        print("Rescheduled invite. New event created.")
        processed_event_ids.add(msg_id)  # Mark this event as processed


def main():
    connector = get_connector()
    identifier = connector.get_user_identifier()
    if not identifier:
        print("Set SCALEKIT_IDENTIFIER in .env")
        return

    processed_msgs = set()
    while True:
        msgs = _try_queries(connector, identifier, max_results=10)
        if msgs:
            # Sort newest to oldest by internalDate (string of epoch ms)
            msgs.sort(key=lambda x: int(x.get("internalDate", "0")), reverse=True)
            for m in msgs:
                msg_id = m.get("id") or m.get("messageId")
                if msg_id in processed_msgs:
                    continue
                process_invitation(connector, identifier, m)
                processed_msgs.add(msg_id)
        time.sleep(60)  # Poll every minute

if __name__ == "__main__":
    main()
