from __future__ import annotations
from typing import Dict, Any, List
from sk_connectors import get_connector

connector = get_connector()

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
    """
    Translate our Google-style event dict into the connector's flat args.
    Expected by connector:
      - calendarId
      - start_datetime (RFC3339 with offset)
      - end_datetime   (RFC3339 with offset)
      - time_zone      (IANA tz, optional but good)
      - summary, description
      - attendees: list of emails
      - send_updates: "all" | "externalOnly" | "none"
      - conference: bool (create a Meet link)
    """
    start_dt = ((event.get("start") or {}).get("dateTime")) or event.get("start_datetime")
    end_dt   = ((event.get("end")   or {}).get("dateTime")) or event.get("end_datetime")
    tz       = ((event.get("start") or {}).get("timeZone")
                or (event.get("end") or {}).get("timeZone")
                or event.get("time_zone"))

    if not start_dt or not end_dt:
        raise ValueError("create_event: start/end datetime missing (must be RFC3339 with timezone offset)")

    attendees = []
    for a in (event.get("attendees") or []):
        if isinstance(a, dict) and a.get("email"):
            attendees.append(a["email"])
        elif isinstance(a, str):
            attendees.append(a)

    params = {
        "calendarId": calendar_id,
        "start_datetime": start_dt,   # <- flat params for connector
        "end_datetime": end_dt,
        "time_zone": tz,
        "summary": event.get("summary") or "Meeting",
        "description": event.get("description") or "",
        "attendees": attendees,
        "send_updates": event.get("sendUpdates") or "all",
        "conference": True,  # ask connector to create a Meet link
    }

    return connector.execute_action_with_retry(
        identifier=identifier,
        tool="googlecalendar_create_event",
        parameters=params
    ) or {}
