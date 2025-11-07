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

    # tz hint (scan subject + body)
    tz_hint = None
    for rx, tz in TZ_HINTS:
        if rx.search(subject or "") or rx.search(body):
            tz_hint = tz
            break

    # exact datetime candidates (subject + body)
    text_all = f"{subject or ''}\n{body}"
    # If subject contains a 4-digit year, remember it to correct parser heuristics
    expected_year = None
    m_year = re.search(r"\b(20\d{2})\b", subject or "")
    if m_year:
        try:
            expected_year = int(m_year.group(1))
        except Exception:
            expected_year = None
    hard_start = None
    hard_end = None
    local_tz = pytz.timezone(tz_hint or user_tz)

    # Strong subject pattern: "Tue Oct 28, 2025 5:45pm - 7:45pm (IST)"
    subj_pat = re.compile(
        r"\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+"
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+"
        r"(\d{1,2}),\s*(\d{4})\s+"
        r"(\d{1,2}:\d{2})\s*(am|pm)"
        r"(?:\s*[-–—]\s*(\d{1,2}:\d{2})\s*(am|pm))?",
        re.I
    )
    m_subj = subj_pat.search(subject or "")
    if m_subj:
        dow, mon_abbr, day, year, t1, ap1, t2, ap2 = (
            m_subj.group(1), m_subj.group(2), m_subj.group(3), m_subj.group(4),
            m_subj.group(5), m_subj.group(6), m_subj.group(7), m_subj.group(8)
        )
        month_map = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        mo = month_map.index(mon_abbr.title()) + 1
        hh, mm = map(int, t1.split(":"))
        if ap1.lower() == "pm" and hh != 12:
            hh += 12
        if ap1.lower() == "am" and hh == 12:
            hh = 0
        local_tz = pytz.timezone(tz_hint or user_tz)
        try:
            start_naive = datetime(int(year), mo, int(day), hh, mm)
            hard_start = local_tz.localize(start_naive)
            if t2 and ap2:
                eh, em = map(int, t2.split(":"))
                if ap2.lower() == "pm" and eh != 12:
                    eh += 12
                if ap2.lower() == "am" and eh == 12:
                    eh = 0
                end_naive = datetime(int(year), mo, int(day), eh, em)
                hard_end = local_tz.localize(end_naive)
                # Update duration from explicit end time
                try:
                    duration = max(1, int((hard_end - hard_start).total_seconds() // 60))
                except Exception:
                    pass
            else:
                hard_end = hard_start + timedelta(minutes=duration)
        except Exception:
            hard_start = None
            hard_end = None

    # Generic parse fallback across subject+body if still missing
    if not hard_start:
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

    # Final correction: if parser chose an obviously wrong or past year but subject had a year
    if hard_start and expected_year and hard_start.year != expected_year:
        try:
            local_tz = pytz.timezone(tz_hint or user_tz)
            s_local = hard_start.astimezone(local_tz) if hard_start.tzinfo else local_tz.localize(hard_start)
            corrected = s_local.replace(year=expected_year)
            hard_end = corrected + timedelta(minutes=duration)
            hard_start = corrected
        except Exception:
            pass

    # Also, if parsed time is > 365 days in the past relative to now, bump to next occurrence of that month/day
    if hard_start:
        try:
            now_local = datetime.now(pytz.timezone(tz_hint or user_tz))
            if (now_local - hard_start).days > 365:
                y = now_local.year if hard_start.month >= now_local.month else now_local.year + 1
                local_tz = pytz.timezone(tz_hint or user_tz)
                s_local = hard_start.astimezone(local_tz)
                corrected = local_tz.localize(datetime(y, s_local.month, s_local.day, s_local.hour, s_local.minute))
                hard_end = corrected + timedelta(minutes=duration)
                hard_start = corrected
        except Exception:
            pass

    # Final sync: if both hard_start and hard_end present, ensure duration matches
    if hard_start and hard_end:
        try:
            duration = max(1, int((hard_end - hard_start).total_seconds() // 60))
        except Exception:
            pass

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
