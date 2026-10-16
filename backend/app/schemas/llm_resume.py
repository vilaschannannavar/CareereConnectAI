"""Pydantic schemas for LLM-extracted structured resume data."""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class EducationItem(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    gpa: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None


class ProjectItem(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    measurable_outcomes: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    link: Optional[str] = None


class WorkExperienceItem(BaseModel):
    company: Optional[str] = None
    position: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: Optional[bool] = False
    bullet_points: List[str] = Field(default_factory=list)


class ParsedResumeSchema(BaseModel):
    """Schema representing structured candidate profile extracted by LLM.

    Rule: No fabrication. If a field is not present in resume text, it must be null or empty list.
    """
    name: Optional[str] = None
    contact_info: Optional[Dict[str, Optional[str]]] = Field(
        default_factory=lambda: {
            "email": None,
            "phone": None,
            "location": None,
            "linkedin_url": None,
            "github_url": None
        }
    )
    education: List[EducationItem] = Field(default_factory=list)
    graduation_year: Optional[int] = None
    skills: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    hardware_experience: List[str] = Field(default_factory=list)
    tools: List[str] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    work_experience: List[WorkExperienceItem] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    coursework: List[str] = Field(default_factory=list)
    career_interests: List[str] = Field(default_factory=list)
