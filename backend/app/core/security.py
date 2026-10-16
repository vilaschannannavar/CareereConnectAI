"""Security primitives: Argon2 hashing, token encryption at rest, CSRF protection, and session tokens."""
import hmac
import hashlib
import secrets
import base64
import time
from typing import Optional
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings

# Argon2 hasher instance with standard memory and parallelism cost parameters
pwd_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return pwd_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against an Argon2 hash."""
    try:
        return pwd_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def _get_fernet_cipher() -> Fernet:
    """Get or derive a 32-byte Fernet cipher key."""
    raw_key = settings.ENCRYPTION_KEY.strip()
    try:
        # Validate if already valid url-safe base64 32 bytes
        return Fernet(raw_key.encode("utf-8"))
    except Exception:
        # Derive a valid Fernet key from SECRET_KEY as fallback
        derived_32 = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
        fernet_key = base64.urlsafe_b64encode(derived_32)
        return Fernet(fernet_key)


def encrypt_token(plain_token: str) -> str:
    """Encrypt a sensitive token or secret at rest using Fernet (AES-128-CBC + HMAC-SHA256)."""
    if not plain_token:
        return ""
    cipher = _get_fernet_cipher()
    encrypted_bytes = cipher.encrypt(plain_token.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_token(encrypted_token: str) -> Optional[str]:
    """Decrypt an encrypted token at rest. Returns None if invalid or tampered."""
    if not encrypted_token:
        return None
    cipher = _get_fernet_cipher()
    try:
        decrypted_bytes = cipher.decrypt(encrypted_token.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken:
        return None


def generate_session_token() -> str:
    """Generate a high-entropy URL-safe session token."""
    return secrets.token_urlsafe(32)


def generate_csrf_token(session_id: str) -> str:
    """Generate a signed, timestamped CSRF token tied to a session ID."""
    timestamp = str(int(time.time()))
    nonce = secrets.token_hex(8)
    message = f"{session_id}:{timestamp}:{nonce}".encode("utf-8")
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()
    token_str = f"{session_id}:{timestamp}:{nonce}:{signature}"
    return base64.urlsafe_b64encode(token_str.encode("utf-8")).decode("utf-8")


def verify_csrf_token(csrf_token: str, session_id: str, max_age_seconds: int = 86400) -> bool:
    """Verify that a CSRF token matches the session ID and has not expired."""
    try:
        decoded = base64.urlsafe_b64decode(csrf_token.encode("utf-8")).decode("utf-8")
        parts = decoded.split(":")
        if len(parts) != 4:
            return False
        token_session_id, timestamp_str, nonce, signature = parts
        
        # Check session match
        if not hmac.compare_digest(token_session_id, session_id):
            return False
            
        # Check token expiration
        token_time = int(timestamp_str)
        current_time = int(time.time())
        if current_time - token_time > max_age_seconds or token_time > current_time + 60:
            return False
            
        # Verify HMAC signature
        expected_msg = f"{token_session_id}:{timestamp_str}:{nonce}".encode("utf-8")
        expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), expected_msg, hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected_sig)
    except Exception:
        return False
