import os
from dotenv import load_dotenv
load_dotenv()

def _as_bool(v: str | None, default=False):
    if v is None: return default
    return v.strip().lower() in {"1","true","yes","y","on"}

class Settings:
    SCALEKIT_ENV_URL = os.getenv("SCALEKIT_ENV_URL","")
    SCALEKIT_CLIENT_ID = os.getenv("SCALEKIT_CLIENT_ID","")
    SCALEKIT_CLIENT_SECRET = os.getenv("SCALEKIT_CLIENT_SECRET","")

    SALESFORCE_IDENTIFIER = os.getenv("SALESFORCE_IDENTIFIER")
    SLACK_IDENTIFIER = os.getenv("SLACK_IDENTIFIER")

    DIGEST_CHANNEL_ID = os.getenv("DIGEST_CHANNEL_ID","")
    LOOKBACK_HOURS = int(os.getenv("LOOKBACK_HOURS","24"))
    SALESFORCE_DOMAIN = os.getenv("SALESFORCE_DOMAIN","")  # optional for deep links

    SF_SNAPSHOT_FILE = os.getenv("SF_SNAPSHOT_FILE","sf_insights_snapshot.json")
    MAX_RECORDS = int(os.getenv("MAX_RECORDS","200"))

    REDACT_EMAILS = _as_bool(os.getenv("REDACT_EMAILS"), True)
    REDACT_PHONES = _as_bool(os.getenv("REDACT_PHONES"), True)
    # Note: Blocks and permalinks removed — text-only posts with deep links.

    @classmethod
    def validate(cls):
        missing = [k for k,v in {
            "SCALEKIT_ENV_URL": cls.SCALEKIT_ENV_URL,
            "SCALEKIT_CLIENT_ID": cls.SCALEKIT_CLIENT_ID,
            "SCALEKIT_CLIENT_SECRET": cls.SCALEKIT_CLIENT_SECRET,
            "SALESFORCE_IDENTIFIER": cls.SALESFORCE_IDENTIFIER,
            "SLACK_IDENTIFIER": cls.SLACK_IDENTIFIER,
        }.items() if not v]
        if missing:
            raise ValueError("Missing required config: " + ", ".join(missing))

try:
    Settings.validate()
    print("✅ Settings OK")
except Exception as e:
    print("⚠️ Settings problem:", e)
