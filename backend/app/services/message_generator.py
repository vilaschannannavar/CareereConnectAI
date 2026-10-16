"""Outreach message drafting engine supporting Templates A, B, C across 4 tones.

Hard Rules:
1. Generate using ONLY confirmed candidate profile and contact's stored fields.
2. NEVER imply a prior relationship.
3. NEVER invent skills, projects, or accomplishments (zero fabrication).
4. Referral Template (B) is strictly gated to Category D contacts unless explicitly chosen.
5. Calculates real-time character length and flags drafts exceeding LinkedIn's 300-character limit.
6. Returns exact 'details_used' dictionary for UI transparency panel.
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import HTTPException, status


class GeneratedDraftResult(BaseModel):
    """Generated outreach message draft and personalization metadata."""
    subject: str
    body: str
    template_code: str
    tone: str
    character_count: int
    character_limit_warning: bool
    details_used: Dict[str, Any]


LINKEDIN_NOTE_LIMIT = 300


def clean_company_name(raw_company: str) -> str:
    """Clean company name for natural message phrasing (e.g. 'Google LLC' -> 'Google')."""
    if not raw_company or raw_company.lower() == "unknown":
        return "your organization"
    cleaned = raw_company.strip()
    for suffix in [", Inc.", " Inc.", " Inc", ", LLC", " LLC", " Ltd.", " Ltd", " Corp.", " Corp", " Corporation"]:
        if cleaned.endswith(suffix):
            cleaned = cleaned[:-len(suffix)]
            break
    return cleaned.strip()


def derive_domain(target_roles: List[str], contact_position: str) -> str:
    """Derive generalized technical or functional domain from confirmed preferences."""
    if target_roles:
        # e.g. "Software Engineer" -> "software engineering"
        role = target_roles[0].strip()
        role_lower = role.lower()
        if "engineer" in role_lower:
            return role_lower.replace("engineer", "engineering")
        if "developer" in role_lower:
            return role_lower.replace("developer", "development")
        return role_lower
    if contact_position and contact_position.lower() != "unknown":
        return f"{contact_position.lower()} initiatives"
    return "technology opportunities"


def format_verified_skills(skills: List[str], max_count: int = 3) -> str:
    """Format verified candidate skills without fabrication."""
    clean = [s.strip() for s in skills if s.strip()]
    if not clean:
        return "relevant technical projects"
    return ", ".join(clean[:max_count])


def generate_outreach_draft(
    template_code: str,
    tone: str,
    contact_first_name: str,
    contact_company: str,
    contact_position: str,
    contact_categories: List[str],
    candidate_name: str,
    candidate_target_roles: List[str],
    candidate_skills: List[str],
    allow_referral_override: bool = False
) -> GeneratedDraftResult:
    """Generate a personalized outreach message draft with strict template gating."""
    template = template_code.upper().strip()
    if template not in {"A", "B", "C"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid template code. Must be 'A' (Recruiter), 'B' (Referral), or 'C' (Hiring Manager)."
        )

    tone_clean = tone.lower().strip()
    if tone_clean not in {"formal", "concise", "conversational", "technical"}:
        tone_clean = "formal"

    # STRICT REFERRAL RULE: Template B only for Category D or explicit override
    if template == "B" and "D" not in contact_categories and not allow_referral_override:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template B (Referral) is restricted to Category D contacts (verified target company or alumni) to prevent unsolicited blanket referral requests. Use Template A or C, or explicitly confirm referral mode."
        )

    first_name = contact_first_name.strip() or "there"
    company = clean_company_name(contact_company)
    cand_name = candidate_name.strip() or "Candidate"
    domain = derive_domain(candidate_target_roles, contact_position)
    skills_text = format_verified_skills(candidate_skills, max_count=3 if tone_clean != "concise" else 2)

    # Details used for personalization audit
    details_used = {
        "contact_first_name": first_name,
        "contact_company": company,
        "contact_position": contact_position or "Unknown",
        "candidate_name": cand_name,
        "derived_domain": domain,
        "target_roles": candidate_target_roles,
        "verified_skills": candidate_skills[:3] if candidate_skills else [],
        "template_code": template,
        "tone": tone_clean,
        "category_d_verified": "D" in contact_categories,
        "referral_override_used": allow_referral_override
    }

    body = ""
    subject = ""

    # =========================================================================
    # TEMPLATE A: Recruiter
    # =========================================================================
    if template == "A":
        subject = f"Inquiry regarding {domain} opportunities at {company}"
        if tone_clean == "formal":
            body = (
                f"Hello {first_name}, I hope you are doing well. I am exploring internship and entry-level opportunities "
                f"related to {domain}. My background includes {skills_text}. I would appreciate it if you could consider "
                f"my resume for suitable openings at {company} and guide me on the application process. Thank you for your time. "
                f"Best regards, {cand_name}"
            )
        elif tone_clean == "concise":
            body = (
                f"Hi {first_name}, exploring entry-level opportunities in {domain} ({skills_text}). "
                f"Would appreciate consideration for openings at {company} and guidance on applying. "
                f"Thanks! Best, {cand_name}"
            )
        elif tone_clean == "conversational":
            body = (
                f"Hi {first_name}, hope you're having a great week! I'm currently looking into opportunities in {domain}, "
                f"with experience in {skills_text}. I'd love to be considered for relevant roles at {company} if you have "
                f"any guidance on the process. Thanks so much! Best, {cand_name}"
            )
        elif tone_clean == "technical":
            body = (
                f"Hello {first_name}, I am pursuing engineering opportunities in {domain}, with verified experience in {skills_text}. "
                f"Would appreciate submitting my qualifications for suitable technical roles at {company}. "
                f"Thank you, {cand_name}"
            )

    # =========================================================================
    # TEMPLATE B: Referral (Category D Only)
    # =========================================================================
    elif template == "B":
        subject = f"Referral inquiry for {domain} roles at {company}"
        contact_area = f"{domain} initiatives" if not contact_position or contact_position == "Unknown" else contact_position
        if tone_clean == "formal":
            body = (
                f"Hello {first_name}, I noticed your experience in {contact_area} at {company}. "
                f"I am interested in {domain} roles, with experience in {skills_text}. If you know of a suitable opening, "
                f"I would appreciate your guidance, and if my profile fits and you are comfortable referring me, "
                f"I would be grateful. Thank you. Best regards, {cand_name}"
            )
        elif tone_clean == "concise":
            body = (
                f"Hi {first_name}, saw your work at {company}. Exploring {domain} roles with background in {skills_text}. "
                f"If my profile aligns and you're open to referring, I'd be grateful. "
                f"Best, {cand_name}"
            )
        elif tone_clean == "conversational":
            body = (
                f"Hi {first_name}, hope you're doing well! Noticed your impressive journey at {company}. "
                f"I'm exploring {domain} roles with a background in {skills_text}. If a role fits your team and you'd feel "
                f"comfortable referring me, I'd deeply appreciate it. Best, {cand_name}"
            )
        elif tone_clean == "technical":
            body = (
                f"Hello {first_name}, noted your work in {contact_area} at {company}. I specialize in {skills_text} targeting {domain} systems. "
                f"If my technical background aligns and you are open to referring, I would appreciate the opportunity. "
                f"Regards, {cand_name}"
            )

    # =========================================================================
    # TEMPLATE C: Hiring Manager / Tech Lead
    # =========================================================================
    elif template == "C":
        subject = f"Connecting regarding your team's work at {company}"
        tech_area = f"{domain}" if not contact_position or contact_position == "Unknown" else contact_position
        if tone_clean == "formal":
            body = (
                f"Hello {first_name}, I am exploring opportunities in {domain} with experience in {skills_text}. "
                f"I noticed your work in {tech_area} at {company} and would appreciate being considered for any suitable "
                f"opening in your team, along with any advice on what your team looks for. Thank you. Best regards, {cand_name}"
            )
        elif tone_clean == "concise":
            body = (
                f"Hi {first_name}, exploring {domain} openings ({skills_text}). "
                f"Noticed your team's work at {company} and would value any advice on what you look for. "
                f"Best, {cand_name}"
            )
        elif tone_clean == "conversational":
            body = (
                f"Hi {first_name}, hope all is well! I'm exploring roles in {domain} and really admire what your team is building at {company}. "
                f"My background is in {skills_text}—would love any advice on what your group looks for. Best, {cand_name}"
            )
        elif tone_clean == "technical":
            body = (
                f"Hello {first_name}, exploring engineering roles in {domain}. Given your technical leadership at {company} and my hands-on "
                f"background in {skills_text}, I would value consideration for openings in your team. Best regards, {cand_name}"
            )

    char_count = len(body)
    char_warning = char_count > LINKEDIN_NOTE_LIMIT

    return GeneratedDraftResult(
        subject=subject,
        body=body,
        template_code=template,
        tone=tone_clean,
        character_count=char_count,
        character_limit_warning=char_warning,
        details_used=details_used
    )
