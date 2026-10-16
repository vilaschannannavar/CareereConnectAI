"""Capability registry endpoint providing the single source of truth for UI actions."""
from fastapi import APIRouter
from app.schemas.capabilities import CapabilitiesResponse
from app.core.capabilities import get_capabilities

router = APIRouter(prefix="/capabilities", tags=["Capabilities"])


@router.get("", response_model=CapabilitiesResponse)
async def list_capabilities():
    """Retrieve platform capabilities and policy compliance states.

    The frontend MUST consult this registry to dynamically enable or disable
    buttons, workflows, and integrations with clear explanations.
    """
    return CapabilitiesResponse(capabilities=get_capabilities())
