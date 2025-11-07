from __future__ import annotations
from typing import Dict, Any, List
from datetime import datetime, timedelta
import pytz
from dateutil import parser as du
from sk_connectors import get_connector
from slotting import derive_busy,overlaps

connector = get_connector()

def iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat()

def list_calendars(identifier: str) -> List[Dict]:
    return connector.execute_action_with_retry(
        identifier=identifier,
        tool="googlecalendar_list_calendars",
        parameters={}
    ) or []

def list_events(identifier: str, calendar_id: str, time_min: str, time_max: str, max_results: int = 250) -> List[Dict]:
    return connector.execute_action_with_retry(
        identifier=identifier,
        tool="googlecalendar_list_events",
        parameters={
            "calendarId": calendar_id,
            "timeMin": time_min,
            "timeMax": time_max,
            "singleEvents": True,
            "orderBy": "startTime",
            "maxResults": max_results,
        }
    ) or []

def create_event(identifier: str, calendar_id: str, event: Dict[str, Any]) -> Dict:
    start_dt = ((event.get("start") or {}).get("dateTime")) or event.get("start_datetime")
    end_dt   = ((event.get("end") or {}).get("dateTime")) or event.get("end_datetime")
    tz       = ((event.get("start") or {}).get("timeZone")
                or (event.get("end") or {}).get("timeZone")
                or event.get("time_zone"))
    if not start_dt or not end_dt:
        raise ValueError("create_event: start/end datetime missing")

    # Check for overlapping events in the next 30 days
    # Use ISO strings with timezone offsets to search
    from datetime import datetime, timedelta
    events = list_events(identifier, calendar_id,
                         iso(datetime.now(tz=pytz.UTC) - timedelta(days=1)),
                         iso(datetime.now(tz=pytz.UTC) + timedelta(days=30)))
    local_tz = pytz.timezone(tz)
    busy = derive_busy(events, local_tz)
    candidate_start = datetime.fromisoformat(start_dt)
    candidate_end = datetime.fromisoformat(end_dt)
    if not candidate_start.tzinfo:
        candidate_start = local_tz.localize(candidate_start)
    if not candidate_end.tzinfo:
        candidate_end = local_tz.localize(candidate_end)

    for b0, b1 in busy:
        if overlaps(candidate_start, candidate_end, b0, b1):
            return {"error": "Conflict with existing event. Choose another time."}

    attendees_emails = []
    attendees_objs = []
    for a in event.get("attendees") or []:
        if isinstance(a, dict) and a.get("email"):
            email = a["email"]
            attendees_emails.append(email)
            attendees_objs.append({"email": email, "optional": bool(a.get("optional", False))})
        elif isinstance(a, str):
            attendees_emails.append(a)
            attendees_objs.append({"email": a})

    send_updates_value = event.get("sendUpdates") or "all"
    params = {
        "calendarId": calendar_id,
        # Keep snake_case for compatibility with connector variants
        "start_datetime": start_dt,
        "end_datetime": end_dt,
        "time_zone": tz,
        # Also include camelCase variants (some connectors expect these)
        "startDateTime": start_dt,
        "endDateTime": end_dt,
        "timeZone": tz,
        "summary": event.get("summary") or "Meeting",
        "description": event.get("description") or "",
        # Prefer structured attendees
        "attendees": attendees_objs or attendees_emails,
        # Include both key styles for send updates
        "send_updates": send_updates_value,
        "sendUpdates": send_updates_value,
        "conference": True
    }

    return connector.execute_action_with_retry(
        identifier=identifier,
        tool="googlecalendar_create_event",
        parameters=params
    ) or {}