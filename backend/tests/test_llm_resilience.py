"""Tests for LLM gateway resilience and degraded fallback mode."""
import pytest
from app.core.llm import MockLLMService, GeminiLLMService, get_llm_service
from app.core.config import settings


@pytest.mark.asyncio
async def test_mock_llm_service_extraction():
    """Verify MockLLMService extracts structured data deterministically."""
    sample_text = """
    Jane Doe
    jane.doe@example.com | (555) 123-4567
    Education: University of Michigan, B.S. Computer Science, 2024
    Skills: Python, TypeScript, React, PostgreSQL, Docker
    Tools: VS Code, Git, GitHub
    Projects: Distributed Task Queue
    Experience: Software Engineer Intern at Tech Innovations Inc.
    """
    service = MockLLMService()
    parsed = await service.extract_resume_data(sample_text)

    assert parsed.name == "Jane Doe"
    assert parsed.contact_info.get("email") == "jane.doe@example.com"
    assert "Python" in parsed.skills
    assert "TypeScript" in parsed.skills
    assert "PostgreSQL" in parsed.skills
    assert parsed.graduation_year == 2024


@pytest.mark.asyncio
async def test_gemini_degraded_mode_when_offline():
    """Verify GeminiLLMService gracefully degrades to deterministic parser if API is unavailable."""
    sample_text = """
    Alex Smith
    alex@test.org
    Skills: Python, SQL, Docker
    Education: Stanford University, 2023
    """
    # Initialize GeminiLLMService without valid key or with invalid mock endpoint
    gemini_service = GeminiLLMService()
    # When GEMINI_API_KEY is not set or network fails, should fall back to deterministic parser without raising error
    parsed = await gemini_service.extract_resume_data(sample_text)

    assert parsed is not None
    assert "Python" in parsed.skills
    assert "SQL" in parsed.skills
    assert parsed.graduation_year == 2023


def test_get_llm_service_factory():
    """Verify LLM factory returns service cleanly without crashes."""
    service = get_llm_service()
    assert service is not None
