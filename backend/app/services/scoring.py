"""5-Factor scoring and weight renormalization engine for CareerConnect AI.

Scores contacts on a 0-100 scale across:
  1. role_relevance (default: 30)
  2. ability_to_help (default: 25)
  3. company_industry (default: 20)
  4. technical_domain (default: 15)
  5. recruitment_referral_evidence (default: 10)

Handles missing data via dynamic weight renormalization and confidence degradation.
Maps to priority bands: High (>=70), Medium (40-69), Low (<40), Insufficient info (confidence < 0.3 or <2 factors).
"""
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from app.services.classifier import CategoryResult


DEFAULT_WEIGHTS = {
    "role_relevance": 30.0,
    "ability_to_help": 25.0,
    "company_industry": 20.0,
    "technical_domain": 15.0,
    "recruitment_referral_evidence": 10.0,
}

DEFAULT_THRESHOLDS = {
    "high": 70.0,
    "medium": 40.0,
    "min_confidence": 0.3,
    "min_scorable_factors": 2,
}


class FactorScore(BaseModel):
    """Sub-score, normalized weight, and evidence string for a single factor."""
    sub_score: float = Field(ge=0.0, le=100.0)
    weight: float = Field(ge=0.0, le=100.0)
    evidence: str
    is_scorable: bool = True


class ScoreOutcome(BaseModel):
    """Complete scoring calculation outcome."""
    score: float = Field(ge=0.0, le=100.0)
    priority: str
    confidence: float = Field(ge=0.0, le=1.0)
    factor_breakdown: Dict[str, Dict[str, Any]]
    weights_used: Dict[str, float]
    scorable_factors_count: int


def calculate_contact_score(
    position: str,
    company: str,
    category_result: CategoryResult,
    target_roles: List[str],
    target_companies: List[str],
    candidate_skills: List[str],
    custom_weights: Optional[Dict[str, float]] = None,
    custom_thresholds: Optional[Dict[str, float]] = None
) -> ScoreOutcome:
    """Calculate 0-100 match score with dynamic factor exclusion, weight renormalization, and priority tagging."""
    pos_clean = (position or "").strip().lower()
    comp_clean = (company or "").strip().lower()
    cats = category_result.categories
    base_confidence = category_result.confidence

    weights = dict(custom_weights) if custom_weights else dict(DEFAULT_WEIGHTS)
    thresholds = dict(custom_thresholds) if custom_thresholds else dict(DEFAULT_THRESHOLDS)

    factors: Dict[str, FactorScore] = {}

    # -------------------------------------------------------------
    # Factor 1: Role Relevance (30 default)
    # -------------------------------------------------------------
    if not pos_clean or pos_clean == "unknown":
        factors["role_relevance"] = FactorScore(
            sub_score=0.0,
            weight=weights["role_relevance"],
            evidence="No position or job title available",
            is_scorable=False
        )
    else:
        # Check target role alignment
        clean_target_roles = [r.strip().lower() for r in target_roles if r.strip()]
        matched_target = any(tr in pos_clean or pos_clean in tr for tr in clean_target_roles)

        if "A" in cats:
            sub = 85.0
            ev = f"Recruiter role relevant for job searching ({position})"
        elif "C" in cats:
            sub = 90.0 if matched_target else 80.0
            ev = f"Engineering leadership role with hiring oversight ({position})"
        elif "B" in cats and matched_target:
            sub = 90.0
            ev = f"Technical professional directly matching target role ({position})"
        elif "B" in cats:
            sub = 75.0
            ev = f"Technical professional in relevant technology sphere ({position})"
        elif "E" in cats:
            sub = 15.0
            ev = f"Role has low relevance to targeted technology fields ({position})"
        else:
            sub = 40.0
            ev = f"General professional role ({position})"

        factors["role_relevance"] = FactorScore(
            sub_score=sub,
            weight=weights["role_relevance"],
            evidence=ev,
            is_scorable=True
        )

    # -------------------------------------------------------------
    # Factor 2: Ability to Help (25 default)
    # -------------------------------------------------------------
    if "A" in cats:
        sub = 95.0
        ev = "Recruiter has direct mandate to review candidates and process applications"
    elif "C" in cats:
        sub = 85.0
        ev = "Engineering manager / director with team hiring and staffing authority"
    elif "D" in cats:
        sub = 80.0
        ev = "Potential referrer positioned inside a target organization"
    elif "B" in cats:
        sub = 60.0
        ev = "Individual contributor peer able to provide team insights or informal referrals"
    elif "E" in cats:
        sub = 10.0
        ev = "Minimal ability to assist with software engineering employment"
    else:
        sub = 30.0
        ev = "Uncertain referral or hiring capability"

    factors["ability_to_help"] = FactorScore(
        sub_score=sub,
        weight=weights["ability_to_help"],
        evidence=ev,
        is_scorable=True
    )

    # -------------------------------------------------------------
    # Factor 3: Company / Industry (20 default)
    # -------------------------------------------------------------
    if not comp_clean or comp_clean == "unknown":
        factors["company_industry"] = FactorScore(
            sub_score=0.0,
            weight=weights["company_industry"],
            evidence="Company data is missing or unlisted",
            is_scorable=False
        )
    else:
        clean_target_comps = [c.strip().lower() for c in target_companies if c.strip()]
        is_target_comp = any(tc == comp_clean or tc in comp_clean or comp_clean in tc for tc in clean_target_comps)

        if is_target_comp:
            sub = 100.0
            ev = f"Exact or direct match with preferred target company '{company}'"
        elif any(tech_brand in comp_clean for tech_brand in ["tech", "cloud", "software", "ai", "labs", "data", "systems", "digital"]):
            sub = 75.0
            ev = f"Company '{company}' operates in relevant software and technology industry"
        else:
            sub = 45.0
            ev = f"Company '{company}' outside explicit target list"

        factors["company_industry"] = FactorScore(
            sub_score=sub,
            weight=weights["company_industry"],
            evidence=ev,
            is_scorable=True
        )

    # -------------------------------------------------------------
    # Factor 4: Technical Domain (15 default)
    # -------------------------------------------------------------
    if not pos_clean or pos_clean == "unknown":
        factors["technical_domain"] = FactorScore(
            sub_score=0.0,
            weight=weights["technical_domain"],
            evidence="Insufficient title data to evaluate technical domain",
            is_scorable=False
        )
    else:
        # Check candidate skill keywords in position
        clean_skills = [s.strip().lower() for s in candidate_skills if s.strip()]
        matched_skills = [s for s in clean_skills if re.search(rf"\b{re.escape(s)}\b", pos_clean)]

        if matched_skills:
            sub = 95.0
            ev = f"Direct technical domain alignment ({', '.join(matched_skills[:3])})"
        elif "B" in cats or "C" in cats:
            sub = 70.0
            ev = f"General software and engineering technical domain ({position})"
        elif "A" in cats:
            sub = 50.0
            ev = "Technical recruiting domain"
        else:
            sub = 10.0
            ev = "Non-technical domain"

        factors["technical_domain"] = FactorScore(
            sub_score=sub,
            weight=weights["technical_domain"],
            evidence=ev,
            is_scorable=True
        )

    # -------------------------------------------------------------
    # Factor 5: Recruitment / Referral Evidence (10 default)
    # -------------------------------------------------------------
    has_recruiter = "A" in cats
    has_referrer = "D" in cats

    if has_recruiter and has_referrer:
        sub = 100.0
        ev = "Explicit recruiter at a verified target company (strongest outreach target)"
    elif has_recruiter:
        sub = 90.0
        ev = "Explicit recruitment professional verified by title"
    elif has_referrer:
        sub = 85.0
        ev = "Explicit referral evidence verified at target company"
    elif "C" in cats:
        sub = 60.0
        ev = "Leadership position with probable referral/hiring capability"
    elif "B" in cats:
        sub = 40.0
        ev = "Technical peer without explicit referral evidence"
    else:
        sub = 10.0
        ev = "No recruitment or referral evidence found"

    factors["recruitment_referral_evidence"] = FactorScore(
        sub_score=sub,
        weight=weights["recruitment_referral_evidence"],
        evidence=ev,
        is_scorable=True
    )

    # -------------------------------------------------------------
    # Dynamic Renormalization & Scoring Calculation
    # -------------------------------------------------------------
    scorable_factors = {k: v for k, v in factors.items() if v.is_scorable}
    scorable_count = len(scorable_factors)
    total_scorable_weight = sum(v.weight for v in scorable_factors.values())

    factor_breakdown_dict: Dict[str, Dict[str, Any]] = {}
    normalized_weights_dict: Dict[str, float] = {}

    if total_scorable_weight > 0 and scorable_count > 0:
        calculated_score = 0.0
        for name, factor in factors.items():
            if factor.is_scorable:
                norm_w = (factor.weight / total_scorable_weight) * 100.0
                normalized_weights_dict[name] = round(norm_w, 2)
                factor_points = factor.sub_score * (norm_w / 100.0)
                calculated_score += factor_points
                factor_breakdown_dict[name] = {
                    "sub_score": round(factor.sub_score, 1),
                    "normalized_weight": round(norm_w, 2),
                    "original_weight": factor.weight,
                    "evidence": factor.evidence,
                    "is_scorable": True
                }
            else:
                normalized_weights_dict[name] = 0.0
                factor_breakdown_dict[name] = {
                    "sub_score": 0.0,
                    "normalized_weight": 0.0,
                    "original_weight": factor.weight,
                    "evidence": factor.evidence,
                    "is_scorable": False
                }

        final_score = round(calculated_score, 1)
    else:
        final_score = 0.0

    # Confidence scaling: lower confidence when factors are excluded
    total_factors_count = len(factors)
    scaled_confidence = base_confidence * (scorable_count / total_factors_count)
    final_confidence = round(max(0.0, min(1.0, scaled_confidence)), 2)

    # -------------------------------------------------------------
    # Priority Determination
    # -------------------------------------------------------------
    min_conf = thresholds.get("min_confidence", 0.3)
    min_factors = thresholds.get("min_scorable_factors", 2)
    high_thresh = thresholds.get("high", 70.0)
    med_thresh = thresholds.get("medium", 40.0)

    if final_confidence < min_conf or scorable_count < min_factors:
        priority = "Insufficient information"
    elif final_score >= high_thresh:
        priority = "High"
    elif final_score >= med_thresh:
        priority = "Medium"
    else:
        priority = "Low"

    return ScoreOutcome(
        score=final_score,
        priority=priority,
        confidence=final_confidence,
        factor_breakdown=factor_breakdown_dict,
        weights_used=normalized_weights_dict,
        scorable_factors_count=scorable_count
    )
