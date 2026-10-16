"""Unit tests for PII redaction filter in logs."""
import logging
from app.core.logging import redact_pii, PIIRedactionFilter


def test_redact_emails():
    text = "User signed up with email test.candidate+job@example.org in system."
    scrubbed = redact_pii(text)
    assert "test.candidate+job@example.org" not in scrubbed
    assert "[EMAIL_REDACTED]" in scrubbed


def test_redact_bearer_tokens():
    text = "Request headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz"
    scrubbed = redact_pii(text)
    assert "eyJhbGci" not in scrubbed
    assert "Bearer [TOKEN_REDACTED]" in scrubbed


def test_redact_passwords_and_secrets():
    text = 'Config loaded: password="SuperSecret123!" and secret="xyz456"'
    scrubbed = redact_pii(text)
    assert "SuperSecret123!" not in scrubbed
    assert "xyz456" not in scrubbed
    assert "[REDACTED]" in scrubbed


def test_redact_resume_raw_text():
    text = 'Parsed payload: resume_text="Vilas is an expert software engineer with 10 years experience."'
    scrubbed = redact_pii(text)
    assert "expert software engineer" not in scrubbed
    assert "[RESUME_TEXT_REDACTED]" in scrubbed


def test_pii_filter_integration():
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Processed user email user@domain.com with token='secret123'",
        args=(),
        exc_info=None
    )
    pii_filter = PIIRedactionFilter()
    assert pii_filter.filter(record) is True
    assert "user@domain.com" not in record.msg
    assert "secret123" not in record.msg
