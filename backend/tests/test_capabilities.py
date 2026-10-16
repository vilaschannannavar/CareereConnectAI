"""Integration tests for capability registry API and health endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_capabilities_v1(client: AsyncClient):
    response = await client.get("/api/v1/capabilities")
    assert response.status_code == 200
    
    data = response.json()
    assert "capabilities" in data
    caps = data["capabilities"]
    
    # Required capabilities are present
    assert "linkedin_csv_import" in caps
    assert "llm_outreach_drafting" in caps
    assert "direct_linkedin_messaging" in caps
    assert "automated_profile_scraping" in caps
    
    # Supported capabilities are enabled
    assert caps["linkedin_csv_import"]["enabled"] is True
    assert caps["llm_outreach_drafting"]["enabled"] is True
    
    # Prohibited/Unapproved capabilities are disabled with explanations
    assert caps["direct_linkedin_messaging"]["enabled"] is False
    assert "disabled_reason" in caps["direct_linkedin_messaging"]
    assert len(caps["direct_linkedin_messaging"]["disabled_reason"]) > 0
    
    assert caps["automated_profile_scraping"]["enabled"] is False
    assert "disabled_reason" in caps["automated_profile_scraping"]


@pytest.mark.asyncio
async def test_get_capabilities_integrations(client: AsyncClient):
    """Verify requested /api/integrations/capabilities route matches registry."""
    response = await client.get("/api/integrations/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert "capabilities" in data
    assert "linkedin_csv_import" in data["capabilities"]


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Verify /health endpoint returns healthy status."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
