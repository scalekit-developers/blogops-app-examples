"""
settings.py - Configuration Management for Slack Triage Agent

This module centralizes all configuration including environment variables,
channel management, and application settings. It uses python-dotenv to load
from .env file and provides validation for required settings.
"""

import os
from typing import List, Optional

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """
    Application settings loaded from environment variables.

    Configuration Priority:
    1. Environment variables
    2. .env file
    3. Default values (if safe)

    Critical settings without defaults will raise ValueError if missing.
    """

    # ============================================================================
    # SCALEKIT CONFIGURATION
    # ============================================================================

    # Scalekit environment URL (e.g., https://myapp.scalekit.com)
    SCALEKIT_ENV_URL: str = os.getenv("SCALEKIT_ENV_URL", "")

    # Scalekit OAuth client credentials
    SCALEKIT_CLIENT_ID: str = os.getenv("SCALEKIT_CLIENT_ID", "")
    SCALEKIT_CLIENT_SECRET: str = os.getenv("SCALEKIT_CLIENT_SECRET", "")

    # ============================================================================
    # SLACK CONFIGURATION
    # ============================================================================

    # Slack app signing secret for request verification
    # Used to validate that requests actually come from Slack
    SLACK_SIGNING_SECRET: str = os.getenv("SLACK_SIGNING_SECRET", "")

    # Slack bot OAuth token (starts with xoxb-)
    # Used for fallback operations if not using Scalekit for Slack
    SLACK_BOT_TOKEN: str = os.getenv("SLACK_BOT_TOKEN", "")

    # ============================================================================
    # CHANNEL MANAGEMENT
    # ============================================================================

    # Comma-separated list of allowed channel IDs
    # If set, ONLY these channels will trigger agent actions
    # Example: "C01234567,C09876543"
    _allowed_channels_str: str = os.getenv("ALLOWED_CHANNELS", "")
    ALLOWED_CHANNELS: List[str] = [
        ch.strip() for ch in _allowed_channels_str.split(",") if ch.strip()
    ]

    # Comma-separated list of explicitly denied channel IDs
    # These channels will be ignored even if in ALLOWED_CHANNELS
    # Useful for excluding bot-testing or spam channels
    _denied_channels_str: str = os.getenv("DENIED_CHANNELS", "")
    DENIED_CHANNELS: List[str] = [
        ch.strip() for ch in _denied_channels_str.split(",") if ch.strip()
    ]

    # ============================================================================
    # GITHUB CONFIGURATION
    # ============================================================================

    # Default GitHub repository for issue creation
    # Can be overridden per-user in user_mapping.json
    GITHUB_REPO_OWNER: Optional[str] = os.getenv("GITHUB_REPO_OWNER")
    GITHUB_REPO_NAME: Optional[str] = os.getenv("GITHUB_REPO_NAME")

    # ============================================================================
    # ZENDESK CONFIGURATION
    # ============================================================================

    ZENDESK_SUBDOMAIN: Optional[str] = None  # Not supported yet

    # ============================================================================
    # RETRY & RESILIENCE CONFIGURATION
    # ============================================================================

    # Maximum number of retry attempts for Scalekit API calls
    # Used for handling transient errors and rate limiting
    RETRY_ATTEMPTS: int = int(os.getenv("RETRY_ATTEMPTS", "3"))

    # Initial backoff delay in seconds (doubles with each retry)
    # Exponential backoff: 1s, 2s, 4s, 8s...
    RETRY_BACKOFF_SECONDS: int = int(os.getenv("RETRY_BACKOFF", "1"))

    # ============================================================================
    # FLASK SERVER CONFIGURATION
    # ============================================================================

    FLASK_ENV: str = os.getenv("FLASK_ENV", "development")
    FLASK_PORT: int = int(os.getenv("FLASK_PORT", "5000"))
    FLASK_HOST: str = os.getenv("FLASK_HOST", "0.0.0.0")

    # Enable debug mode (should be False in production)
    FLASK_DEBUG: bool = FLASK_ENV == "development"

    # OAuth Redirect URI (must be whitelisted in Scalekit dashboard)
    # For local development: http://localhost:5000/auth/callback
    # For production/ngrok: https://your-domain.com/auth/callback
    OAUTH_REDIRECT_URI: Optional[str] = os.getenv("OAUTH_REDIRECT_URI")

    # ============================================================================
    # OPTIONAL: LLM CONFIGURATION (for advanced routing)
    # ============================================================================

    # OpenAI API key if using LLM-based routing instead of rule-based
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")

    # Model to use for LLM routing decisions
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")

    # ============================================================================
    # POLLING CONFIGURATION (for Scalekit-native mode)
    # ============================================================================

    # How often to poll Slack channels for new messages (in seconds)
    POLL_INTERVAL_SECONDS: int = int(os.getenv("POLL_INTERVAL_SECONDS", "30"))

    # How far back to look for messages on FIRST poll (in seconds)
    # This is only used on the first poll; after that, it uses the last poll timestamp
    # Default: 24 hours (86400 seconds) to catch messages from today
    POLL_LOOKBACK_SECONDS: int = int(os.getenv("POLL_LOOKBACK_SECONDS", "86400"))

    # Small overlap to prevent boundary misses when advancing the poll window
    POLL_OVERLAP_SECONDS: float = float(os.getenv("POLL_OVERLAP_SECONDS", "1"))

    # If the first poll returns no messages and this fallback window is larger
    # than POLL_LOOKBACK_SECONDS, perform a one-time fallback fetch without
    # changing configuration. Helps when lookback is set too small.
    POLL_EMPTY_FALLBACK_SECONDS: int = int(os.getenv("POLL_EMPTY_FALLBACK_SECONDS", "900"))

    # Optional: On startup, widen the initial lookback window to this value.
    # Useful after downtime or when you want to ensure backfill.
    RESYNC_ON_START: bool = os.getenv("RESYNC_ON_START", "false").lower() in ("1", "true", "yes")
    RESYNC_LOOKBACK_SECONDS: int = int(os.getenv("RESYNC_LOOKBACK_SECONDS", "3600"))

    # ============================================================================
    # USER MAPPING FILE
    # ============================================================================

    # Path to JSON file containing Slack user -> external account mappings
    USER_MAPPING_FILE: str = os.getenv("USER_MAPPING_FILE", "user_mapping.json")

    # ============================================================================
    # ROUTING KEYWORDS
    # ============================================================================

    # Keywords that trigger GitHub issue creation
    # Messages containing any of these will route to GitHub
    GITHUB_KEYWORDS: List[str] = [
        "bug",
        "error",
        "github:",
        "issue:",
        "broken",
        "crash",
        "exception"
    ]

    # Keywords that trigger Zendesk ticket creation (not supported yet)
    ZENDESK_KEYWORDS: List[str] = [
        "support",
        "help",
        "zendesk:",
        "ticket:",
        "customer",
        "billing",
        "question"
    ]

    # ============================================================================
    # VALIDATION
    # ============================================================================

    @classmethod
    def validate(cls) -> None:
        """
        Validate that all critical configuration is present.

        Raises:
            ValueError: If required configuration is missing
        """
        required_settings = {
            "SCALEKIT_ENV_URL": cls.SCALEKIT_ENV_URL,
            "SCALEKIT_CLIENT_ID": cls.SCALEKIT_CLIENT_ID,
            "SCALEKIT_CLIENT_SECRET": cls.SCALEKIT_CLIENT_SECRET,
        }

        # Note: SLACK_SIGNING_SECRET is not required for polling mode
        # It's only needed if using webhook mode (main.py)

        missing = [key for key, value in required_settings.items() if not value]

        if missing:
            raise ValueError(
                f"Missing required configuration: {', '.join(missing)}. "
                "Please check your .env file or environment variables."
            )

    @classmethod
    def is_channel_allowed(cls, channel_id: str) -> bool:
        """
        Check if a channel is allowed to trigger agent actions.

        Logic:
        1. If channel is in DENIED_CHANNELS -> False
        2. If ALLOWED_CHANNELS is empty -> True (allow all)
        3. If channel is in ALLOWED_CHANNELS -> True
        4. Otherwise -> False

        Args:
            channel_id: Slack channel ID (e.g., "C01234567")

        Returns:
            True if channel is allowed, False otherwise
        """
        # Explicitly denied channels are always blocked
        if channel_id in cls.DENIED_CHANNELS:
            return False

        # If no allow list specified, allow all (except denied)
        if not cls.ALLOWED_CHANNELS:
            return True

        # Check if channel is in allow list
        return channel_id in cls.ALLOWED_CHANNELS

    @classmethod
    def get_summary(cls) -> dict:
        """
        Get a summary of current configuration (safe for logging).

        Returns:
            Dictionary of configuration with secrets redacted
        """
        return {
            "scalekit_configured": bool(cls.SCALEKIT_ENV_URL and cls.SCALEKIT_CLIENT_ID),
            "slack_configured": bool(cls.SLACK_SIGNING_SECRET),
            "allowed_channels": cls.ALLOWED_CHANNELS or ["all"],
            "denied_channels": cls.DENIED_CHANNELS or ["none"],
            "github_repo": f"{cls.GITHUB_REPO_OWNER}/{cls.GITHUB_REPO_NAME}" if cls.GITHUB_REPO_OWNER else "not configured",
            "zendesk_subdomain": cls.ZENDESK_SUBDOMAIN or "not configured",
            "retry_attempts": cls.RETRY_ATTEMPTS,
            "flask_port": cls.FLASK_PORT,
        }


# Validate configuration on import (fail fast if misconfigured)
try:
    Settings.validate()
    print("✅ Configuration loaded successfully")
    print(f"📋 Config summary: {Settings.get_summary()}")
except ValueError as e:
    print(f"❌ Configuration error: {e}")
    print("⚠️  Please create a .env file with required variables")
    print("📖 See README.md for setup instructions")
    # Don't raise here to allow imports, but validation will fail at runtime
