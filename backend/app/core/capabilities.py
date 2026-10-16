"""Capability Registry: Single source of truth for platform features and policies."""
from typing import Dict, Optional
from pydantic import BaseModel
from app.core.config import settings


class CapabilityItem(BaseModel):
    """Definition of a specific capability and its operational status."""
    key: str
    enabled: bool
    label: str
    description: str
    disabled_reason: Optional[str] = None
    documentation_url: Optional[str] = None


def is_linkedin_oauth_configured() -> bool:
    """Check if LinkedIn OAuth credentials are provided."""
    client_id = (settings.LINKEDIN_CLIENT_ID or "").strip()
    client_secret = (settings.LINKEDIN_CLIENT_SECRET or "").strip()
    return bool(client_id and client_secret and "placeholder" not in client_id.lower())


def get_capabilities() -> Dict[str, CapabilityItem]:
    """Retrieve the full capability registry dynamically reflecting runtime configuration."""
    linkedin_configured = is_linkedin_oauth_configured()

    registry = {
        "linkedin_csv_import": CapabilityItem(
            key="linkedin_csv_import",
            enabled=True,
            label="LinkedIn Data Export (CSV)",
            description="Import your 1st-degree connections from your official LinkedIn data archive.",
            documentation_url="https://www.linkedin.com/help/linkedin/answer/a1339364"
        ),
        "synthetic_data_generator": CapabilityItem(
            key="synthetic_data_generator",
            enabled=True,
            label="Synthetic Test Fixtures",
            description="Generate realistic synthetic connection data for development and testing."
        ),
        "llm_outreach_drafting": CapabilityItem(
            key="llm_outreach_drafting",
            enabled=True,
            label="AI Outreach Drafting",
            description="Draft personalized cold messages, referral requests, and coffee chats using structured AI."
        ),
        "copy_to_send_workflow": CapabilityItem(
            key="copy_to_send_workflow",
            enabled=True,
            label="Copy & Send Workflow",
            description="Copy generated outreach to your clipboard and open LinkedIn to paste and send."
        ),
        "manual_send_tracking": CapabilityItem(
            key="manual_send_tracking",
            enabled=True,
            label="Manual Outreach Tracking",
            description="Record when you have manually sent an outreach message on LinkedIn."
        ),
        "linkedin_official_oauth": CapabilityItem(
            key="linkedin_official_oauth",
            enabled=linkedin_configured,
            label="Official LinkedIn Sign-In",
            description="Direct sign-in using LinkedIn OAuth 2.0 OpenID Connect.",
            disabled_reason=(
                None
                if linkedin_configured
                else "Official LinkedIn OAuth app is not configured in this environment. Use email/password authentication."
            ),
        ),
        "direct_connections_api": CapabilityItem(
            key="direct_connections_api",
            enabled=False,
            label="Direct Connections API",
            description="Live synchronization of connections via LinkedIn Connections API.",
            disabled_reason="LinkedIn Connections API requires enterprise partner approval. CSV export is used instead."
        ),
        "direct_linkedin_messaging": CapabilityItem(
            key="direct_linkedin_messaging",
            enabled=False,
            label="Direct LinkedIn Messaging",
            description="Automated message dispatch through LinkedIn API.",
            disabled_reason="Direct automated messaging is disabled because no officially approved LinkedIn Enterprise Partner API is configured. The user must send messages manually."
        ),
        "automated_profile_scraping": CapabilityItem(
            key="automated_profile_scraping",
            enabled=False,
            label="Automated LinkedIn Scraping",
            description="Automated scraping of public or private LinkedIn profiles.",
            disabled_reason="Strict Policy Prohibition: automated browser sessions and scraping of linkedin.com are strictly prohibited."
        ),
        "inmail_automation": CapabilityItem(
            key="inmail_automation",
            enabled=False,
            label="Automated InMail",
            description="Automated dispatch of LinkedIn InMail messages.",
            disabled_reason="InMail automation requires specialized enterprise partner credentials."
        ),
    }
    return registry


def is_capability_enabled(key: str) -> bool:
    """Check if a specific capability is enabled."""
    caps = get_capabilities()
    cap = caps.get(key)
    return cap.enabled if cap else False
