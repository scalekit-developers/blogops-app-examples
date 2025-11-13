import json, re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List

EMAIL_RE = re.compile(r"([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})", re.I)
PHONE_RE = re.compile(r"\+?\d[\d\-\s().]{6,}\d")

def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def to_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

def hours_ago(hours: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta_hours(hours)

def timedelta_hours(hours: int):
    from datetime import timedelta
    return timedelta(hours=hours)

def redact_pii(text: str, mask_email=True, mask_phone=True) -> str:
    if not text: return text
    out = text
    if mask_email:
        def _m(m):
            local, domain = m.group(1), m.group(2)
            if len(local) <= 2:
                local_mask = "*" * len(local)
            else:
                local_mask = local[0] + "*"*(len(local)-2) + local[-1]
            return f"{local_mask}@{domain}"
        out = EMAIL_RE.sub(_m, out)
    if mask_phone:
        def _p(m):
            s = re.sub(r"\D","",m.group(0))
            if len(s) <= 4:
                return "*"*len(s)
            return "*"*(len(s)-2) + s[-2:]
        out = PHONE_RE.sub(_p, out)
    return out

def load_snapshot(path: str) -> Dict[str, str]:
    try:
        p = Path(path)
        if not p.exists(): return {}
        with p.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return {str(k): str(v) for k,v in data.items()}
    except Exception:
        pass
    return {}

def save_snapshot(path: str, snapshot: Dict[str,str]) -> None:
    try:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with p.open("w", encoding="utf-8") as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
