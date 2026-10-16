"""Security Review: Upload abuse tests covering wrong magic bytes, oversize, and zip bombs."""
import io
import zipfile
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.resume_parser import validate_file_magic_bytes
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_magic_bytes_spoofing_abuse():
    """Verify that uploading non-matching binaries is rejected immediately."""
    # 1. ELF executable named resume.pdf
    elf_header = b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 200
    with pytest.raises(HTTPException) as exc_info:
        validate_file_magic_bytes(elf_header, "malicious.pdf")
    assert exc_info.value.status_code == 400
    assert "magic bytes mismatch" in exc_info.value.detail.lower()

    # 2. Windows PE executable named resume.docx
    pe_header = b"MZ\x90\x00\x03\x00\x00\x00" + b"\x00" * 200
    with pytest.raises(HTTPException) as exc_info:
        validate_file_magic_bytes(pe_header, "exploit.docx")
    assert exc_info.value.status_code == 400
    assert "magic bytes mismatch" in exc_info.value.detail.lower()

    # 3. Disallowed extensions (.exe, .sh, .py)
    with pytest.raises(HTTPException) as exc_info:
        validate_file_magic_bytes(b"%PDF-1.4", "script.sh")
    assert exc_info.value.status_code == 400
    assert "unsupported file format" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_oversize_file_upload_guard():
    """Verify that files exceeding 5MB are strictly rejected."""
    oversized = b"%PDF-1.5" + (b"0" * (5 * 1024 * 1024 + 1024))
    with pytest.raises(HTTPException) as exc_info:
        validate_file_magic_bytes(oversized, "huge.pdf")
    assert exc_info.value.status_code == 400
    assert "maximum allowed size" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_docx_decompression_bomb_protection():
    """Verify that zip bombs / decompression bombs in docx containers are trapped."""
    # Create an in-memory zip archive with a file that claims excessive uncompressed size
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        # Create a repetitive entry that would compress down small but uncompress to > 25MB
        # We write 26 MB of null bytes
        large_data = b"A" * (26 * 1024 * 1024)
        zf.writestr("word/document.xml", large_data)

    bomb_bytes = buf.getvalue()

    with pytest.raises(HTTPException) as exc_info:
        validate_file_magic_bytes(bomb_bytes, "zipbomb.docx")
    assert exc_info.value.status_code == 400
    assert "decompression bomb" in exc_info.value.detail.lower() or "security threshold" in exc_info.value.detail.lower()
