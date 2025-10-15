## scheduler/entities.py

from __future__ import annotations
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class Attendee(BaseModel):
    email: str
    optional: bool = False

class ParsedEmail(BaseModel):
    title: str
    duration_minutes: int = 30
    tz_hint: Optional[str] = None
    hard_start: Optional[datetime] = None
    hard_end: Optional[datetime] = None
    date_phrase: Optional[str] = None
    attendees: List[Attendee] = Field(default_factory=list)

class ProposedSlots(BaseModel):
    title: str
    duration_minutes: int
    slots: List[str]  # human readable