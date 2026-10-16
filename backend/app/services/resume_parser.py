"""Resume validation and text extraction service supporting PDF and DOCX documents."""
import io
import re
from fastapi import HTTPException, status
from pypdf import PdfReader
from docx import Document
from app.core.config import settings
from app.core.logging import logger

import zipfile

PDF_MAGIC = b"%PDF-"
DOCX_MAGIC = b"PK\x03\x04"
MAX_UNCOMPRESSED_DOCX_BYTES = 25 * 1024 * 1024  # 25 MB max uncompressed
MAX_DOCX_FILES = 500
MAX_COMPRESSION_RATIO = 100.0


def check_docx_decompression_safety(content: bytes) -> None:
    """Validate DOCX zip archive against decompression bombs and recursive zip bombs."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            total_uncompressed = 0
            infolist = zf.infolist()
            if len(infolist) > MAX_DOCX_FILES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="DOCX archive contains too many files (possible archive bomb)."
                )
            for info in infolist:
                total_uncompressed += info.file_size
                if total_uncompressed > MAX_UNCOMPRESSED_DOCX_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="DOCX uncompressed size exceeds security threshold (possible decompression bomb)."
                    )
                if info.compress_size > 0 and (info.file_size / info.compress_size) > MAX_COMPRESSION_RATIO:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="DOCX compression ratio exceeds security threshold (possible zip bomb)."
                    )
    except zipfile.BadZipFile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid DOCX archive."
        )


def validate_file_magic_bytes(content: bytes, filename: str) -> str:
    """Validate file size, extension, and magic bytes.

    Returns detected normalized file type ('pdf' or 'docx').
    Raises HTTPException 400 on spoofing or invalid file formats.
    """
    # 1. Size guard (max 5 MB)
    if len(content) > settings.MAX_RESUME_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_RESUME_SIZE_BYTES // (1024 * 1024)} MB."
        )

    clean_name = filename.lower().strip()

    # 2. PDF validation
    if clean_name.endswith(".pdf"):
        # Check magic bytes (must start with %PDF-)
        if not content.startswith(PDF_MAGIC):
            logger.warning(f"File '{filename}' has .pdf extension but lacks %PDF- magic bytes.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content does not match genuine PDF binary signature (magic bytes mismatch)."
            )
        return "pdf"

    # 3. DOCX validation (Office Open XML ZIP container)
    elif clean_name.endswith(".docx"):
        # Check magic bytes (must start with PK\x03\x04)
        if not content.startswith(DOCX_MAGIC):
            logger.warning(f"File '{filename}' has .docx extension but lacks PK ZIP magic bytes.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content does not match genuine DOCX OpenXML binary signature (magic bytes mismatch)."
            )
        # Defense-in-depth: check for zip/decompression bombs
        check_docx_decompression_safety(content)
        return "docx"

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only official .pdf and .docx documents are accepted."
        )


def extract_text_from_resume(content: bytes, file_type: str) -> str:
    """Extract clean raw text from PDF or DOCX file bytes."""
    extracted_text = ""

    if file_type == "pdf":
        try:
            reader = PdfReader(io.BytesIO(content))
            pages_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                pages_text.append(text)
            extracted_text = "\n\n".join(pages_text)
        except Exception as exc:
            logger.error(f"Failed to extract PDF text: {exc}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unable to parse text from PDF: {str(exc)}"
            )

    elif file_type == "docx":
        try:
            doc = Document(io.BytesIO(content))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            
            # Also extract text from tables if present
            table_cells = []
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text.strip():
                            table_cells.append(cell.text.strip())

            extracted_text = "\n".join(paragraphs + table_cells)
        except Exception as exc:
            logger.error(f"Failed to extract DOCX text: {exc}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unable to parse text from DOCX document: {str(exc)}"
            )

    # Sanitize null bytes and normalize whitespace
    cleaned = extracted_text.replace("\x00", "")
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    return cleaned.strip()
