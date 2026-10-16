"""Per-user LLM budget tracking and cost cap enforcement service."""
from typing import Dict, Any
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.logging import logger

# In-memory accumulator for per-user LLM usage costs
_user_llm_spend: Dict[str, float] = {}


class LLMBudgetExceededError(HTTPException):
    """Exception raised when an LLM operation exceeds the user's allocated cost cap."""

    def __init__(self, user_id: str, current_spend: float, cap: float):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Per-user LLM budget cap of ${cap:.2f} USD exceeded (current usage: ${current_spend:.4f} USD). Further LLM requests are blocked."
        )


def get_user_llm_spend(user_id: str) -> float:
    """Retrieve accumulated LLM cost spent by the user in USD."""
    return _user_llm_spend.get(user_id, 0.0)


def get_user_budget_status(user_id: str) -> Dict[str, Any]:
    """Retrieve user's current LLM budget usage, remaining balance, and cap status."""
    spent = get_user_llm_spend(user_id)
    cap = settings.LLM_USER_BUDGET_CAP_USD
    remaining = max(0.0, cap - spent)
    return {
        "user_id": user_id,
        "budget_cap_usd": cap,
        "total_spent_usd": round(spent, 4),
        "remaining_usd": round(remaining, 4),
        "is_capped": spent >= cap
    }


def enforce_llm_budget(user_id: str, estimated_cost: float = 0.005) -> None:
    """Check if the user has sufficient remaining LLM budget; raise HTTP 429 if capped."""
    current_spend = get_user_llm_spend(user_id)
    cap = settings.LLM_USER_BUDGET_CAP_USD

    if current_spend + estimated_cost > cap:
        logger.warning(
            f"User {user_id} exceeded LLM budget cap of ${cap:.2f}. "
            f"Current: ${current_spend:.4f}, Requested: ${estimated_cost:.4f}"
        )
        raise LLMBudgetExceededError(user_id, current_spend, cap)


def record_llm_spend(user_id: str, cost: float = 0.005) -> float:
    """Record an LLM cost deduction for the user and return the new total spend."""
    _user_llm_spend[user_id] = _user_llm_spend.get(user_id, 0.0) + cost
    return _user_llm_spend[user_id]


def reset_user_budget(user_id: str) -> None:
    """Reset accumulated LLM usage for a user (used in testing or administrative resets)."""
    _user_llm_spend.pop(user_id, None)
