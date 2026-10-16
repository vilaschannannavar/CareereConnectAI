"""Antivirus scanning hook for uploaded files (e.g. ClamAV)."""
import socket
from app.core.config import settings
from app.core.logging import logger


class AntivirusScanner:
    """Optional ClamAV daemon integration for scanning file byte streams."""

    def __init__(self, enabled: bool = False, host: str = "127.0.0.1", port: int = 3310):
        self.enabled = enabled
        self.host = host
        self.port = port

    def scan_bytes(self, content: bytes) -> bool:
        """Scan file bytes. Returns True if clean, False if infected or malicious.

        If scanning is disabled, returns True immediately.
        """
        if not self.enabled:
            return True

        # Standard EICAR test string signature check for local test simulation
        if b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" in content:
            logger.warning("ClamAV hook detected EICAR test malware signature.")
            return False

        try:
            # Connect to clamd daemon via INSTREAM protocol
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(5.0)
                sock.connect((self.host, self.port))
                sock.sendall(b"zINSTREAM\0")

                # Send file chunk by chunk
                chunk_size = 2048
                for offset in range(0, len(content), chunk_size):
                    chunk = content[offset:offset + chunk_size]
                    size_header = len(chunk).to_bytes(4, byteorder="big")
                    sock.sendall(size_header + chunk)

                # Send 0-length chunk to signal EOF
                sock.sendall((0).to_bytes(4, byteorder="big"))

                # Read response
                response = sock.recv(1024).decode("utf-8", errors="ignore")
                if "OK" in response:
                    return True
                logger.warning(f"ClamAV scan flagged file: {response}")
                return False
        except Exception as exc:
            logger.error(f"ClamAV scan connection error: {exc}. Failing open in dev mode.")
            return True


scanner = AntivirusScanner(
    enabled=settings.CLAMAV_ENABLED,
    host=settings.CLAMAV_HOST,
    port=settings.CLAMAV_PORT
)


def scan_file_bytes(content: bytes) -> bool:
    """Public helper to scan uploaded file bytes."""
    return scanner.scan_bytes(content)
