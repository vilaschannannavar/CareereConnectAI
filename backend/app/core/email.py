"""Pluggable email service supporting Console (dev/testing) and SMTP (production)."""
import logging
import smtplib
from abc import ABC, abstractmethod
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict
from app.core.config import settings

logger = logging.getLogger("careerconnect.email")


class EmailProvider(ABC):
    """Abstract base class for delivering transaction emails."""

    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
    ) -> bool:
        pass


class ConsoleEmailProvider(EmailProvider):
    """Development and test provider that logs emails and stores them for assertions."""

    sent_emails: List[Dict[str, str]] = []

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
    ) -> bool:
        record = {
            "to": to_email,
            "subject": subject,
            "body": body_text,
            "html": body_html or body_text,
        }
        ConsoleEmailProvider.sent_emails.append(record)
        logger.info(
            f"\n--- [OUTGOING TRANSACTIONAL EMAIL] ---\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Content:\n{body_text}\n"
            f"--------------------------------------\n"
        )
        return True


class SmtpEmailProvider(EmailProvider):
    """Production SMTP provider."""

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
    ) -> bool:
        if not self.host:
            logger.warning("SMTP_HOST not configured. Falling back to console logging.")
            console = ConsoleEmailProvider()
            return await console.send_email(to_email, subject, body_text, body_html)

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email

            part1 = MIMEText(body_text, "plain")
            msg.attach(part1)

            if body_html:
                part2 = MIMEText(body_html, "html")
                msg.attach(part2)

            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                server.starttls()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.sendmail(self.from_email, [to_email], msg.as_string())

            logger.info(f"Email successfully delivered to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to deliver email via SMTP: {e}")
            return False


def get_email_provider() -> EmailProvider:
    if settings.EMAIL_PROVIDER == "smtp" and settings.SMTP_HOST:
        return SmtpEmailProvider()
    return ConsoleEmailProvider()


async def send_password_reset_email(to_email: str, token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    subject = "Reset your CareerConnect AI password"
    body = (
        f"Hello,\n\n"
        f"You requested to reset your password for CareerConnect AI.\n"
        f"Click the link below to set a new password (valid for 1 hour):\n\n"
        f"{reset_url}\n\n"
        f"If you did not request this, please ignore this email. Your account remains secure.\n"
    )
    provider = get_email_provider()
    return await provider.send_email(to_email, subject, body)


async def send_verification_email(to_email: str, token: str) -> bool:
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject = "Verify your email - CareerConnect AI"
    body = (
        f"Welcome to CareerConnect AI!\n\n"
        f"Please verify your email address by clicking the link below:\n\n"
        f"{verify_url}\n\n"
        f"Thank you,\n"
        f"CareerConnect AI Team\n"
    )
    provider = get_email_provider()
    return await provider.send_email(to_email, subject, body)
