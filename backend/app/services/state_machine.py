"""Server-side enforced outreach state machine.

State Graph:
  Draft -> Reviewed -> Approved -> Awaiting manual send -> User-confirmed sent
                                -> Sending -> Sent (verified) [if verified integration]
                                -> Cancelled
  Approved -> (edit) -> Draft
  Sending -> Failed
  Failed -> Draft

Rules:
- Illegal transitions strictly raise HTTP 409 Conflict.
- Editing an Approved draft resets it to Draft.
- Copying logs a 'copied' event and changes NO state.
- Distinction between 'Sent (verified)' and 'Marked sent by you' (User-confirmed sent).
"""
from typing import Set, Dict
from fastapi import HTTPException, status

VALID_STATES = {
    "Draft",
    "Reviewed",
    "Approved",
    "Awaiting manual send",
    "User-confirmed sent",
    "Sending",
    "Sent (verified)",
    "Failed",
    "Cancelled",
}

# Permitted state transitions
PERMITTED_TRANSITIONS: Dict[str, Set[str]] = {
    "Draft": {"Reviewed", "Approved", "Cancelled"},
    "Reviewed": {"Approved", "Draft", "Cancelled"},
    "Approved": {"Awaiting manual send", "Sending", "Draft", "Cancelled"},
    "Awaiting manual send": {"User-confirmed sent", "Approved", "Cancelled"},
    "Sending": {"Sent (verified)", "Failed"},
    "User-confirmed sent": set(),  # Terminal send state; follow-up tracked via OutreachEvent
    "Sent (verified)": set(),      # Terminal send state
    "Failed": {"Draft", "Cancelled"},
    "Cancelled": {"Draft"},
}


def validate_state_transition(current_state: str, next_state: str) -> None:
    """Validate that transition from current_state to next_state is legally allowed.

    Raises:
        HTTPException 409 Conflict if transition is illegal.
    """
    if current_state not in VALID_STATES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Unknown current state: '{current_state}'"
        )

    if next_state not in VALID_STATES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Unknown target state: '{next_state}'"
        )

    if current_state == next_state:
        return  # No-op transition allowed

    allowed = PERMITTED_TRANSITIONS.get(current_state, set())
    if next_state not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Illegal state transition from '{current_state}' to '{next_state}'. Allowed target states: {sorted(list(allowed)) or 'None (terminal)'}."
        )


def reset_to_draft_if_edited(current_state: str) -> str:
    """When an approved draft is modified, server-side rule resets status to Draft."""
    if current_state == "Approved":
        return "Draft"
    return current_state
