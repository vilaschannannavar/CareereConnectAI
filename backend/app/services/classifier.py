"""Deterministic and LLM-assisted contact classification engine.

Categorizes connections into:
  A: HR / Recruiting
  B: Technical Professional
  C: Engineering Leadership
  D: Potential Referrer (STRICT REQUIREMENT: Requires explicit evidence — target company or explicit alumni)
  E: Low Relevance / Uncertain

Multi-tag support enabled (e.g. ['B', 'D']).
"""
import re
import hashlib
from typing import List, Dict, Any, Optional, Set
from pydantic import BaseModel, Field


class CategoryResult(BaseModel):
    """Classification outcome for a single contact."""
    categories: List[str] = Field(default_factory=list)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    reasons: List[str] = Field(default_factory=list)
    missing_info: List[str] = Field(default_factory=list)


# Deterministic keyword patterns
HR_KEYWORDS = [
    r"\brecruit(er|ing)?\b",
    r"\btalent acquisition\b",
    r"\bsourcer\b",
    r"\bheadhunter\b",
    r"\bpeople (operations|partner|lead)\b",
    r"\bhuman resources\b",
    r"\bhr (manager|generalist|specialist|partner|director)\b",
    r"\btechnical sourcer\b",
    r"\bcampus recruit(er|ing)\b",
    r"\buniversity recruit(er|ing)\b",
]

LEADERSHIP_KEYWORDS = [
    r"\bengineering manager\b",
    r"\bsoftware engineering manager\b",
    r"\btech lead manager\b",
    r"\bdirector of engineering\b",
    r"\bvp of engineering\b",
    r"\bvice president(,|\s)? engineering\b",
    r"\bhead of engineering\b",
    r"\bchief technology officer\b",
    r"\bcto\b",
    r"\bvp technology\b",
    r"\bprincipal engineering manager\b",
    r"\bdev manager\b",
    r"\bsoftware manager\b",
    r"\barchitect director\b",
]

TECH_KEYWORDS = [
    r"\bsoftware\b",
    r"\bengineer(ing)?\b",
    r"\bdeveloper\b",
    r"\bprogrammer\b",
    r"\barchitect\b",
    r"\bdata scientist\b",
    r"\bdata engineer\b",
    r"\bmachine learning\b",
    r"\bml engineer\b",
    r"\bai engineer\b",
    r"\bdevops\b",
    r"\bsre\b",
    r"\bsite reliability\b",
    r"\bfull[\s-]stack\b",
    r"\bfront[\s-]end\b",
    r"\bback[\s-]end\b",
    r"\bfirmware\b",
    r"\bembedded\b",
    r"\bsystems engineer\b",
    r"\bsecurity engineer\b",
    r"\bcloud engineer\b",
    r"\bqa engineer\b",
    r"\btest engineer\b",
    r"\bweb developer\b",
]

LOW_RELEVANCE_KEYWORDS = [
    r"\brealtor\b",
    r"\breal estate\b",
    r"\bnurse\b",
    r"\bphysician\b",
    r"\bchef\b",
    r"\blawyer\b",
    r"\battorney\b",
    r"\bparalegal\b",
    r"\bfitness\b",
    r"\bpersonal trainer\b",
    r"\bdriver\b",
    r"\bwaiter\b",
    r"\bwaitress\b",
    r"\bbarista\b",
    r"\bcarpenter\b",
    r"\bplumber\b",
    r"\belectrician\b",
    r"\baccountant\b",
    r"\bauditor\b",
    r"\binsurance agent\b",
    r"\bfinancial advisor\b",
]


def compute_content_hash(
    position: str,
    company: str,
    target_roles: List[str],
    target_companies: List[str]
) -> str:
    """Compute deterministic SHA-256 hash of contact and target context for caching."""
    raw = f"{position.strip().lower()}|{company.strip().lower()}|{','.join(sorted(target_roles)).lower()}|{','.join(sorted(target_companies)).lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def classify_deterministic(
    position: str,
    company: str,
    target_companies: List[str],
    target_schools: Optional[List[str]] = None,
    contact_notes: Optional[str] = None
) -> CategoryResult:
    """Deterministic keyword-based classification layer with strict Category D evidence rules."""
    pos_clean = (position or "").strip().lower()
    comp_clean = (company or "").strip().lower()
    notes_clean = (contact_notes or "").strip().lower()

    categories: Set[str] = set()
    reasons: List[str] = []
    missing_info: List[str] = []

    # Check for missing basic information
    if not pos_clean or pos_clean == "unknown":
        missing_info.append("Job position / title missing")
    if not comp_clean or comp_clean == "unknown":
        missing_info.append("Company / employer missing")

    # If title is completely absent, classify as E with low confidence
    if not pos_clean or pos_clean == "unknown":
        return CategoryResult(
            categories=["E"],
            confidence=0.2,
            reasons=["Position is unknown or missing"],
            missing_info=missing_info
        )

    # 1. Check for Category C (Engineering Leadership)
    is_leadership = any(re.search(pat, pos_clean) for pat in LEADERSHIP_KEYWORDS)
    if is_leadership:
        categories.add("C")
        reasons.append(f"Position '{position}' matches engineering leadership keywords")

    # 2. Check for Category A (HR / Recruiting)
    is_recruiter = any(re.search(pat, pos_clean) for pat in HR_KEYWORDS)
    if is_recruiter:
        categories.add("A")
        reasons.append(f"Position '{position}' matches HR/recruiting keywords")

    # 3. Check for Category B (Technical Professional)
    is_tech = any(re.search(pat, pos_clean) for pat in TECH_KEYWORDS)
    if is_tech and not is_recruiter and not is_leadership:
        categories.add("B")
        reasons.append(f"Position '{position}' matches technical engineering keywords")
    elif is_tech and (is_leadership or is_recruiter):
        # Multi-tag: e.g. Technical Recruiter gets A, or VP Engineering gets C
        pass

    # 4. Check for Category D (Potential Referrer) - STRICT EVIDENCE REQUIRED
    # HARD RULE: Category D requires explicit evidence (works at a user target company, or alumni data explicitly present).
    # Never infer alumni status or any sensitive attribute!
    has_target_company_evidence = False
    clean_target_companies = [c.strip().lower() for c in target_companies if c.strip()]
    if comp_clean and comp_clean != "unknown":
        for tc in clean_target_companies:
            if tc == comp_clean or tc in comp_clean or comp_clean in tc:
                has_target_company_evidence = True
                reasons.append(f"Works at target company '{company}' (matches career target '{tc}')")
                break

    has_alumni_evidence = False
    if target_schools and (notes_clean or pos_clean):
        clean_schools = [s.strip().lower() for s in target_schools if s.strip()]
        for school in clean_schools:
            if school in notes_clean or school in pos_clean:
                has_alumni_evidence = True
                reasons.append(f"Explicit alumni evidence verified: '{school}' present in connection data")
                break

    if has_target_company_evidence or has_alumni_evidence:
        categories.add("D")

    # 5. Check for Category E (Low Relevance / Uncertain)
    is_low_relevance = any(re.search(pat, pos_clean) for pat in LOW_RELEVANCE_KEYWORDS)
    if is_low_relevance and not categories:
        categories.add("E")
        reasons.append(f"Position '{position}' falls outside targeted technology and recruiting fields")

    # If no category matched yet, check if it's uncertain
    if not categories:
        categories.add("E")
        reasons.append(f"Role '{position}' does not match known technical or recruiting patterns")
        confidence = 0.5
    else:
        # High confidence for deterministic keyword matches
        confidence = 0.9 if not missing_info else 0.7

    return CategoryResult(
        categories=sorted(list(categories)),
        confidence=confidence,
        reasons=reasons,
        missing_info=missing_info
    )
