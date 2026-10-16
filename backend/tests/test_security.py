"""Unit tests for security primitives: Argon2, Fernet token encryption, and CSRF protection."""
import time
import pytest
from app.core.security import (
    hash_password,
    verify_password,
    encrypt_token,
    decrypt_token,
    generate_session_token,
    generate_csrf_token,
    verify_csrf_token
)


def test_argon2_password_hashing():
    raw_pwd = "SuperSecretPassword123!"
    hashed = hash_password(raw_pwd)
    
    assert hashed != raw_pwd
    assert hashed.startswith("$argon2")
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_fernet_token_encryption():
    secret_oauth_token = "oauth_token_linkedin_abc123xyz"
    encrypted = encrypt_token(secret_oauth_token)
    
    assert encrypted != secret_oauth_token
    assert len(encrypted) > 20
    
    decrypted = decrypt_token(encrypted)
    assert decrypted == secret_oauth_token
    
    # Decryption fails gracefully on corrupt ciphertext
    assert decrypt_token("invalid_corrupt_cipher_text") is None


def test_session_token_entropy():
    tok1 = generate_session_token()
    tok2 = generate_session_token()
    assert tok1 != tok2
    assert len(tok1) >= 32


def test_csrf_token_lifecycle():
    session_id = "session_12345"
    csrf_token = generate_csrf_token(session_id)
    
    # Valid token passes
    assert verify_csrf_token(csrf_token, session_id) is True
    
    # Wrong session ID is rejected
    assert verify_csrf_token(csrf_token, "wrong_session") is False
    
    # Tampered token is rejected
    tampered = csrf_token[:-4] + "abcd"
    assert verify_csrf_token(tampered, session_id) is False
    
    # Expired token is rejected
    assert verify_csrf_token(csrf_token, session_id, max_age_seconds=-1) is False
