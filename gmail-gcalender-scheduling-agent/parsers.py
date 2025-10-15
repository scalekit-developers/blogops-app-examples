from __future__ import annotations
import os
import re
from datetime import datetime, timedelta
from typing import Dict, List

import pytz
import dateparser
from dateutil import parser as du

from entities import ParsedEmail, Attendee

DUR_RE = re.compile(r"\b(\d+)\s*(min|mins|minutes|hour|hours|hr|hrs)\b", re.I)
TZ_HINTS = [
    (re.compile(r"\bIST\b", re.I), "Asia/Kolkata"),
    (re.compile(r"\bPST\b|\bPT\b", re.I), "America/Los_Angeles"),
    (re.compile(r"\bCET\b", re.I), "Europe/Paris"),
    (re.compile(r"\bBST\b|\bUK time\b", re.I), "Europe/London"),
]

HTML_TAG_RE = re.compile(r"<[^>]+>")
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)


def strip_html(text: str | None) -> str:
    return HTML_TAG_RE.sub(" ", text or "")


def parse_entities(subject: str, body_raw: str, headers: Dict, *,
                   user_tz: str = "Asia/Kolkata", default_duration: int = 30) -> ParsedEmail:
    """
    Minimal changes:
    - Keep your duration/tz logic
    - Parse exact date-times as before
    - NEW: if only a date is present (no time), set start at WORK_START_LOCAL in user_tz
    - Also recognizes HTML microdata: itemprop="startDate" datetime="YYYYMMDD"
    """
    body = strip_html(body_raw)
    title = (subject or "Meeting").strip()[:120]
    work_start_hm = os.getenv("WORK_START_LOCAL", "10:00")

    # duration
    m = DUR_RE.search(body)
    if m:
        val = int(m.group(1))
        unit = m.group(2).lower()
        duration = val * 60 if unit.startswith(("hr", "hour")) else val
    else:
        duration = default_duration

    # tz hint
    tz_hint = None
    for rx, tz in TZ_HINTS:
        if rx.search(body):
            tz_hint = tz
            break

    # exact datetime candidates (subject + body)
    text_all = f"{subject or ''}\n{body}"
    hard_start = None
    hard_end = None
    local_tz = pytz.timezone(tz_hint or user_tz)

    candidates = re.findall(
        r"([A-Za-z]{3,9}\s+\d{1,2}.*?\d{1,2}(:\d{2})?\s*(am|pm)?)|(\d{4}-\d{2}-\d{2}[\sT]\d{1,2}:\d{2})",
        text_all,
        flags=re.I
    )
    for tup in candidates:
        text = next((t for t in tup if t), None)
        if not text:
            continue
        try:
            settings = {"TIMEZONE": tz_hint or user_tz, "RETURN_AS_TIMEZONE_AWARE": True}
            parsed = dateparser.parse(text, settings=settings)
            if parsed:
                hard_start = parsed
                hard_end = hard_start + timedelta(minutes=duration)
                break
        except Exception:
            continue

    # NEW: date-only patterns → default to WORK_START_LOCAL time
    if not hard_start:
        # Pattern like: "@ Thu Oct 16, 2025"
        m_date_only = re.search(
            r'@\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+'
            r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+'
            r'(\d{1,2}),\s*(\d{4})',
            text_all,
            re.IGNORECASE
        )
        if m_date_only:
            mon_abbr = m_date_only.group(2).title()
            day = int(m_date_only.group(3))
            year = int(m_date_only.group(4))
            month_map = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
            try:
                h, mm = work_start_hm.split(":")
                start_naive = datetime(
                    year,
                    month_map.index(mon_abbr) + 1,
                    day,
                    int(h), int(mm)
                )
                hard_start = local_tz.localize(start_naive)
                hard_end = hard_start + timedelta(minutes=duration)
            except Exception:
                pass

    if not hard_start:
        # HTML microdata: itemprop="startDate" datetime="YYYYMMDD"
        m_meta = re.search(r'itemprop="startDate"\s+datetime="(\d{8})"', text_all)
        if m_meta:
            ymd = m_meta.group(1)
            try:
                y = int(ymd[0:4]); mo = int(ymd[4:6]); d = int(ymd[6:8])
                h, mm = work_start_hm.split(":")
                start_naive = datetime(y, mo, d, int(h), int(mm))
                hard_start = local_tz.localize(start_naive)
                hard_end = hard_start + timedelta(minutes=duration)
            except Exception:
                pass

    # phrase fallback (unchanged)
    phrase_match = re.search(
        r"(tomorrow|next\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|afternoon|morning|evening)[^.\n]{0,50}",
        body, flags=re.I
    )
    date_phrase = phrase_match.group(0).strip() if phrase_match else None

    # attendees from headers (unchanged)
    attendees: List[Attendee] = []
    for key in ("To", "Cc", "From", "to", "cc", "from"):
        val = headers.get(key) or ""
        for e in EMAIL_RE.findall(val):
            if e.lower() not in {a.email.lower() for a in attendees}:
                attendees.append(Attendee(email=e))

    return ParsedEmail(
        title=title,
        duration_minutes=duration,
        tz_hint=tz_hint,
        hard_start=hard_start,
        hard_end=hard_end,
        date_phrase=date_phrase,
        attendees=attendees,
    )
