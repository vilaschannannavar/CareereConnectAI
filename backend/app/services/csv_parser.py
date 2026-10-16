"""LinkedIn Connections CSV ingestion parser and deduplication upsert engine."""
import csv
import io
import re
import zipfile
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.models.contact import Contact, normalize_linkedin_url
from app.core.logging import logger

CANONICAL_COLUMNS = {
    "first name": "first_name",
    "last name": "last_name",
    "url": "profile_url",
    "profile url": "profile_url",
    "email address": "email",
    "email": "email",
    "company": "company",
    "current company": "company",
    "position": "position",
    "current position": "position",
    "job title": "position",
    "connected on": "connected_on",
}


def extract_csv_from_possible_zip(file_bytes: bytes) -> Tuple[bytes, str]:
    """If file_bytes is a ZIP archive, locate and extract Connections.csv.

    Returns (csv_bytes, detected_filename).
    """
    if file_bytes.startswith(b"PK\x03\x04") or zipfile.is_zipfile(io.BytesIO(file_bytes)):
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                # 1. Exact match for Connections.csv (case-insensitive, root or subdirectory)
                for name in zf.namelist():
                    if name.lower().endswith("connections.csv"):
                        return zf.read(name), name
                # 2. Match any CSV with 'connection'
                for name in zf.namelist():
                    if "connection" in name.lower() and name.lower().endswith(".csv"):
                        return zf.read(name), name
                # 3. If there is a single CSV file in the archive
                csv_files = [n for n in zf.namelist() if n.lower().endswith(".csv") and not n.startswith("__MACOSX")]
                if len(csv_files) == 1:
                    return zf.read(csv_files[0]), csv_files[0]
                raise ValueError(
                    f"Could not find 'Connections.csv' in the ZIP archive. "
                    f"Found files: {', '.join([n for n in zf.namelist() if not n.endswith('/')][:5])}"
                )
        except zipfile.BadZipFile:
            pass
    return file_bytes, "Connections.csv"


def decode_csv_bytes(file_bytes: bytes) -> str:
    """Decode raw CSV bytes handling UTF-8 BOM (utf-8-sig) and legacy encodings."""
    # 1. Try utf-8-sig to automatically strip BOM
    try:
        return file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        pass

    # 2. Try standard utf-8
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        pass

    # 3. Try latin-1 (common in Windows exports)
    try:
        return file_bytes.decode("latin-1")
    except UnicodeDecodeError:
        pass

    # 4. Fallback to cp1252
    return file_bytes.decode("cp1252", errors="replace")


def strip_preamble_notes(csv_text: str) -> Tuple[int, str]:
    """Strip instructional preamble notes (e.g. 'Notes:\n1. ...') preceding the table header.

    Returns:
        (preamble_line_count, cleaned_csv_text_starting_from_header)
    """
    lines = csv_text.splitlines()
    header_idx = -1

    for idx, line in enumerate(lines):
        line_clean = line.strip().lower()
        if not line_clean:
            continue
        # Check if line contains typical LinkedIn export column headers
        if (
            ("first name" in line_clean and "last name" in line_clean)
            or ("first name" in line_clean and "company" in line_clean)
            or ("first name" in line_clean and "url" in line_clean)
        ):
            header_idx = idx
            break

    if header_idx == -1:
        # If no recognized header is found, fall back to line 0
        return 0, csv_text

    cleaned_text = "\n".join(lines[header_idx:])
    return header_idx, cleaned_text


def parse_csv_preview(file_bytes: bytes) -> Dict[str, Any]:
    """Parse CSV (or ZIP archive containing Connections.csv) to extract headers and preview rows."""
    csv_bytes, inner_name = extract_csv_from_possible_zip(file_bytes)
    decoded = decode_csv_bytes(csv_bytes)
    preamble_count, clean_csv = strip_preamble_notes(decoded)

    reader = csv.reader(io.StringIO(clean_csv))
    rows = list(reader)

    if not rows:
        return {
            "preamble_lines_stripped": preamble_count,
            "headers": [],
            "preview": [],
            "total_rows": 0,
            "mapping_suggestions": {}
        }

    raw_headers = [h.strip() for h in rows[0]]
    mapping_suggestions: Dict[str, str] = {}
    for h in raw_headers:
        norm_key = h.lower()
        if norm_key in CANONICAL_COLUMNS:
            mapping_suggestions[h] = CANONICAL_COLUMNS[norm_key]

    preview_rows: List[Dict[str, str]] = []
    data_rows = rows[1:]

    for r in data_rows[:10]:
        row_dict = {}
        for col_idx, header_name in enumerate(raw_headers):
            row_dict[header_name] = r[col_idx].strip() if col_idx < len(r) else ""
        preview_rows.append(row_dict)

    return {
        "preamble_lines_stripped": preamble_count,
        "headers": raw_headers,
        "preview": preview_rows,
        "total_rows": len(data_rows),
        "mapping_suggestions": mapping_suggestions,
    }


async def upsert_connections_csv(
    db: AsyncSession,
    user_id: str,
    file_bytes: bytes,
    custom_mapping: Optional[Dict[str, str]] = None
) -> Dict[str, int]:
    csv_bytes, _ = extract_csv_from_possible_zip(file_bytes)
    decoded = decode_csv_bytes(csv_bytes)
    _, clean_csv = strip_preamble_notes(decoded)

    reader = csv.reader(io.StringIO(clean_csv))
    rows = list(reader)

    if not rows:
        return {"total": 0, "added": 0, "updated": 0}

    raw_headers = [h.strip() for h in rows[0]]
    # Build column index mapping
    col_map: Dict[str, int] = {}
    for idx, header in enumerate(raw_headers):
        field_target = None
        if custom_mapping and header in custom_mapping:
            field_target = custom_mapping[header]
        elif header.lower() in CANONICAL_COLUMNS:
            field_target = CANONICAL_COLUMNS[header.lower()]

        if field_target:
            col_map[field_target] = idx

    added_count = 0
    updated_count = 0

    for row in rows[1:]:
        if not row or not any(cell.strip() for cell in row):
            continue  # Skip blank lines

        first_name = row[col_map["first_name"]].strip() if "first_name" in col_map and col_map["first_name"] < len(row) else ""
        last_name = row[col_map["last_name"]].strip() if "last_name" in col_map and col_map["last_name"] < len(row) else ""
        
        # Skip if no name exists at all
        if not first_name and not last_name:
            continue

        raw_url = row[col_map["profile_url"]].strip() if "profile_url" in col_map and col_map["profile_url"] < len(row) else ""
        normalized_url = normalize_linkedin_url(raw_url)

        email = row[col_map["email"]].strip() if "email" in col_map and col_map["email"] < len(row) else None
        if not email:
            email = None

        company = row[col_map["company"]].strip() if "company" in col_map and col_map["company"] < len(row) else ""
        company = company if company else "Unknown"

        position = row[col_map["position"]].strip() if "position" in col_map and col_map["position"] < len(row) else ""
        position = position if position else "Unknown"

        connected_on = row[col_map["connected_on"]].strip() if "connected_on" in col_map and col_map["connected_on"] < len(row) else None

        # Duplicate detection:
        # Primary check: normalized URL
        existing_contact = None
        if normalized_url:
            stmt = select(Contact).where(
                Contact.user_id == user_id,
                Contact.profile_url_normalized == normalized_url
            )
            existing_contact = (await db.execute(stmt)).scalar_one_or_none()

        # Fallback check: name + company
        if not existing_contact:
            stmt = select(Contact).where(
                Contact.user_id == user_id,
                Contact.first_name.ilike(first_name),
                Contact.last_name.ilike(last_name),
                Contact.company.ilike(company)
            )
            existing_contact = (await db.execute(stmt)).scalar_one_or_none()

        if existing_contact:
            # Re-import updates existing contact
            existing_contact.company = company
            existing_contact.position = position
            if email:
                existing_contact.email = email
            if connected_on:
                existing_contact.connected_on = connected_on
            if raw_url and not existing_contact.profile_url:
                existing_contact.profile_url = raw_url
                existing_contact.profile_url_normalized = normalized_url
            updated_count += 1
        else:
            # Insert new contact
            new_contact = Contact(
                user_id=user_id,
                first_name=first_name,
                last_name=last_name,
                profile_url=raw_url,
                profile_url_normalized=normalized_url,
                email=email,
                company=company,
                position=position,
                connected_on=connected_on,
                is_archived=False
            )
            db.add(new_contact)
            added_count += 1

    await db.commit()
    return {
        "total": added_count + updated_count,
        "added": added_count,
        "updated": updated_count
    }
