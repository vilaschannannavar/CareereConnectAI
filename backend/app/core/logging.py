"""Logging configuration with mandatory PII (Personally Identifiable Information) redaction.

Redacts emails, authorization tokens, passwords, and raw resume content from all system logs.
"""
import re
import logging
from typing import Any


EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
    re.IGNORECASE
)
BEARER_TOKEN_PATTERN = re.compile(
    r"(Bearer\s+)[A-Za-z0-9\-_.~+/]+=*",
    re.IGNORECASE
)
PASSWORD_FIELD_PATTERN = re.compile(
    r'(["\']?(?:password|token|secret|encryption_key|key)["\']?\s*[:=]\s*["\'])([^"\',\s]+)(["\']?)',
    re.IGNORECASE
)
RESUME_TEXT_PATTERN = re.compile(
    r'(["\']?(?:resume_text|resume_content|raw_text)["\']?\s*[:=]\s*["\'])(.*?)(["\'](?=,|\s*\}|$))',
    re.IGNORECASE | re.DOTALL
)


def redact_pii(text: str) -> str:
    """Scrub PII and sensitive tokens from log text."""
    if not isinstance(text, str):
        text = str(text)
    
    # Redact email addresses
    redacted = EMAIL_PATTERN.sub("[EMAIL_REDACTED]", text)
    # Redact Bearer tokens
    redacted = BEARER_TOKEN_PATTERN.sub(r"\1[TOKEN_REDACTED]", redacted)
    # Redact password and sensitive secret key values
    redacted = PASSWORD_FIELD_PATTERN.sub(r"\1[REDACTED]\3", redacted)
    # Redact raw resume text bodies
    redacted = RESUME_TEXT_PATTERN.sub(r"\1[RESUME_TEXT_REDACTED]\3", redacted)
    return redacted


class PIIRedactionFilter(logging.Filter):
    """Logging filter that redacts sensitive PII from log records before dispatch."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_pii(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: redact_pii(str(v)) for k, v in record.args.items()}
            elif isinstance(record.args, (list, tuple)):
                record.args = tuple(redact_pii(str(a)) for a in record.args)
        return True


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Configure root logger with PII redaction filter."""
    logger = logging.getLogger("careerconnect")
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Avoid duplicate handlers if already configured
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        handler.addFilter(PIIRedactionFilter())
        logger.addHandler(handler)
        
    return logger


logger = setup_logging()
