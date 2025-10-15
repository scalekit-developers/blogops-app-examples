from __future__ import annotations
from typing import List, Tuple
from datetime import datetime, timedelta, time as dtime

import pytz
from dateutil import parser as du


def iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat()


def derive_busy(events: list, local_tz: pytz.BaseTzInfo) -> List[Tuple[datetime, datetime]]:
    busy = []
    for e in events:
        s = (e.get("start", {}).get("dateTime") or e.get("start", {}).get("date"))
        t = (e.get("end", {}).get("dateTime") or e.get("end", {}).get("date"))
        if not s or not t:
            continue
        sdt = du.isoparse(s)
        tdt = du.isoparse(t)
        if not sdt.tzinfo:
            sdt = local_tz.localize(sdt)
        if not tdt.tzinfo:
            tdt = local_tz.localize(tdt)
        busy.append((sdt.astimezone(local_tz), tdt.astimezone(local_tz)))
    return busy


def overlaps(a0: datetime, a1: datetime, b0: datetime, b1: datetime) -> bool:
    return a0 < b1 and a1 > b0


def suggest_slots(busy: List[Tuple[datetime, datetime]], *,
                  now_local: datetime, work_start: dtime, work_end: dtime,
                  duration_min: int, buffer_min: int,
                  days_ahead: int = 10, limit: int = 5) -> List[Tuple[datetime, datetime]]:
    slots: List[Tuple[datetime, datetime]] = []
    for d in range(1, days_ahead + 1):
        if len(slots) >= limit:
            break
        day = now_local + timedelta(days=d)
        if day.weekday() >= 5:
            continue
        start_dt = day.replace(hour=work_start.hour, minute=work_start.minute, second=0, microsecond=0)
        end_dt_day = day.replace(hour=work_end.hour, minute=work_end.minute, second=0, microsecond=0)
        cur = start_dt
        while cur + timedelta(minutes=duration_min) <= end_dt_day and len(slots) < limit:
            s = cur
            e = cur + timedelta(minutes=duration_min)
            s_buf = s - timedelta(minutes=buffer_min)
            e_buf = e + timedelta(minutes=buffer_min)
            clash = any(overlaps(s_buf, e_buf, b0, b1) for (b0, b1) in busy)
            if not clash and s > now_local:
                slots.append((s, e))
            cur += timedelta(minutes=30)
    return slots


def human_slot(slot: Tuple[datetime, datetime], tz_label: str) -> str:
    s, e = slot
    return f"{s:%a, %b %d} — {s:%I:%M %p}–{e:%I:%M %p} {tz_label}"