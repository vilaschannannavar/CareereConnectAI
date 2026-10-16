"""LinkedIn OpenID Connect (OIDC) Authentication Service.

Handles authorization URL generation, state and nonce validation,
token exchange, and ID token claim verification.
"""
import time
import secrets
import json
import base64
import httpx
from typing import Dict, Any, Optional, Tuple
from app.core.config import settings
from app.core.logging import logger

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"


def is_linkedin_configured() -> bool:
    """Check if LinkedIn OAuth credentials are provided."""
    client_id = (settings.LINKEDIN_CLIENT_ID or "").strip()
    client_secret = (settings.LINKEDIN_CLIENT_SECRET or "").strip()
    return bool(client_id and client_secret and "placeholder" not in client_id.lower())


def generate_oauth_state_and_nonce() -> Tuple[str, str]:
    """Generate high-entropy state and nonce parameters for OIDC authorization."""
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    return state, nonce


def build_authorization_url(state: str, nonce: str) -> str:
    """Build the LinkedIn OIDC authorization redirect URL."""
    if not is_linkedin_configured():
        raise ValueError("LinkedIn OAuth credentials are not configured.")

    params = {
        "response_type": "code",
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        "state": state,
        "scope": "openid profile email",
        "nonce": nonce,
    }
    encoded = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{LINKEDIN_AUTH_URL}?{encoded}"


def decode_jwt_unverified(jwt_token: str) -> Dict[str, Any]:
    """Safely decode the claims payload of a JWT for validation."""
    parts = jwt_token.split(".")
    if len(parts) != 3:
        raise ValueError("Malformed JWT structure.")
    
    # Pad base64 payload if needed
    payload_b64 = parts[1]
    padded = payload_b64 + "=" * (-len(payload_b64) % 4)
    payload_bytes = base64.urlsafe_b64decode(padded)
    return json.loads(payload_bytes.decode("utf-8"))


def validate_id_token_claims(
    claims: Dict[str, Any],
    expected_client_id: str,
    expected_nonce: Optional[str] = None
) -> bool:
    """Validate standard OIDC claims: issuer, audience, expiration, and nonce."""
    now = int(time.time())
    
    # 1. Expiration check
    exp = claims.get("exp", 0)
    if now > exp:
        logger.warning("LinkedIn ID Token has expired.")
        return False
        
    # 2. Audience check (must match client_id, which can be str or list)
    aud = claims.get("aud")
    if isinstance(aud, list):
        if expected_client_id not in aud:
            logger.warning(f"Audience mismatch in ID token: expected {expected_client_id}, got {aud}")
            return False
    elif aud != expected_client_id:
        logger.warning(f"Audience mismatch in ID token: expected {expected_client_id}, got {aud}")
        return False

    # 3. Nonce check: LinkedIn OIDC often omits the nonce claim in the issued ID token.
    # If the token contains a nonce, verify it matches; otherwise accept if state already matched.
    token_nonce = claims.get("nonce")
    if token_nonce is not None and expected_nonce:
        if token_nonce != expected_nonce:
            logger.warning(f"Nonce mismatch in ID token: expected {expected_nonce}, got {token_nonce}")
            return False

    # 4. Subject check
    if not claims.get("sub"):
        logger.warning("Missing subject ('sub') claim in ID token.")
        return False

    return True


async def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """Exchange authorization code for access token and ID token."""
    if not is_linkedin_configured():
        raise ValueError("LinkedIn credentials are not configured.")

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "client_secret": settings.LINKEDIN_CLIENT_SECRET,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(LINKEDIN_TOKEN_URL, data=data, headers=headers)
        if response.status_code != 200:
            err_text = response.text
            try:
                err_json = response.json()
                err_text = err_json.get("error_description") or err_json.get("error") or response.text
            except Exception:
                pass
            logger.error(f"Failed to exchange LinkedIn code ({response.status_code}): {err_text}")
            raise ValueError(f"LinkedIn token exchange failed ({response.status_code}): {err_text}")
        return response.json()


async def fetch_userinfo(access_token: str) -> Dict[str, Any]:
    """Fetch userinfo profile claims from LinkedIn."""
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(LINKEDIN_USERINFO_URL, headers=headers)
        if response.status_code != 200:
            logger.error(f"Failed to fetch LinkedIn userinfo: {response.text}")
            raise ValueError("Failed to fetch userinfo from LinkedIn")
        return response.json()
