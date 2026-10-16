"""Unit tests for LinkedIn OIDC authorization-code flow logic."""
import time
import pytest
from app.core.linkedin_oidc import (
    is_linkedin_configured,
    generate_oauth_state_and_nonce,
    validate_id_token_claims
)
from app.core.capabilities import get_capabilities


def test_linkedin_oidc_disabled_when_credentials_not_set(monkeypatch):
    """Verify that when credentials are not configured, capability reports disabled with explanation."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "LINKEDIN_CLIENT_ID", None)
    monkeypatch.setattr(settings, "LINKEDIN_CLIENT_SECRET", None)
    assert is_linkedin_configured() is False
    caps = get_capabilities()
    assert caps["linkedin_official_oauth"].enabled is False
    assert "not configured" in caps["linkedin_official_oauth"].disabled_reason.lower()


def test_state_and_nonce_entropy():
    state1, nonce1 = generate_oauth_state_and_nonce()
    state2, nonce2 = generate_oauth_state_and_nonce()
    assert state1 != state2
    assert nonce1 != nonce2
    assert len(state1) >= 32
    assert len(nonce1) >= 32


def test_validate_id_token_claims():
    client_id = "test_client_id_123"
    valid_claims = {
        "sub": "linkedin_user_abc",
        "aud": client_id,
        "exp": int(time.time()) + 3600,
        "nonce": "test_nonce_xyz",
        "email": "student@linkedin.com"
    }

    # Valid token passes
    assert validate_id_token_claims(valid_claims, client_id, "test_nonce_xyz") is True

    # Expired token fails
    expired_claims = valid_claims.copy()
    expired_claims["exp"] = int(time.time()) - 10
    assert validate_id_token_claims(expired_claims, client_id, "test_nonce_xyz") is False

    # Audience mismatch fails
    bad_aud = valid_claims.copy()
    bad_aud["aud"] = "other_client_id"
    assert validate_id_token_claims(bad_aud, client_id, "test_nonce_xyz") is False

    # Nonce mismatch fails
    bad_nonce = valid_claims.copy()
    assert validate_id_token_claims(bad_nonce, client_id, "wrong_nonce") is False

    # Omitted nonce passes (standard LinkedIn OIDC behavior)
    no_nonce_claims = valid_claims.copy()
    del no_nonce_claims["nonce"]
    assert validate_id_token_claims(no_nonce_claims, client_id, "test_nonce_xyz") is True

    # Audience as a list containing client_id passes
    list_aud_claims = valid_claims.copy()
    list_aud_claims["aud"] = [client_id, "additional_aud"]
    assert validate_id_token_claims(list_aud_claims, client_id, "test_nonce_xyz") is True
