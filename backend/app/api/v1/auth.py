import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.session import UserSession
from app.models.integration import Integration
from app.models.candidate_profile import CandidateProfile
from app.models.resume import Resume
from app.models.contact import Contact
from app.models.contact_analysis import ContactAnalysis
from app.models.shortlist import Shortlist
from app.models.message_draft import MessageDraft
from app.models.outreach_event import OutreachEvent
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    AuthSessionResponse,
    UserResponse,
    MessageResponse
)
from app.core.security import (
    hash_password,
    verify_password,
    generate_session_token,
    generate_csrf_token,
    encrypt_token
)
from app.core.config import settings
from app.core.logging import logger
from app.core.rate_limit import auth_rate_limiter
from app.core.linkedin_oidc import (
    is_linkedin_configured,
    generate_oauth_state_and_nonce,
    build_authorization_url,
    exchange_code_for_tokens,
    decode_jwt_unverified,
    validate_id_token_claims,
    fetch_userinfo
)
from app.core.storage import get_storage_service
from app.services.budget import get_user_budget_status
from app.services.audit import record_audit_event
from app.api.deps import get_current_user, get_current_session, verify_csrf

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_session_cookie(response: Response, session_token: str) -> None:
    """Set secure httpOnly session cookie according to security standards."""
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite=settings.SAME_SITE_COOKIE,
        path="/"
    )


def _clear_session_cookie(response: Response) -> None:
    """Clear session cookie upon logout."""
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/"
    )


@router.post("/register", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserRegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user account with Argon2 password hashing and rate limiting."""
    # Apply rate limiting
    auth_rate_limiter.check(request, "register")

    # Check if email is already taken
    stmt = select(User).where(User.email == payload.email.lower().strip())
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Hash password with Argon2
    hashed = hash_password(payload.password)
    new_user = User(
        email=payload.email.lower().strip(),
        password_hash=hashed,
        full_name=payload.full_name,
        is_active=True
    )
    db.add(new_user)
    await db.flush()

    # Create session
    session_token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.SESSION_MAX_AGE_SECONDS)
    user_session = UserSession(
        user_id=new_user.id,
        session_token=session_token,
        expires_at=expires_at,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(user_session)
    await db.commit()
    await db.refresh(new_user)

    # Issue cookie and CSRF token
    _set_session_cookie(response, session_token)
    csrf_token = generate_csrf_token(session_token)

    await record_audit_event(
        db=db,
        user_id=new_user.id,
        action="register",
        entity_type="user",
        details={"email": new_user.email}
    )

    logger.info(f"User registered successfully: {new_user.email}")
    return AuthSessionResponse(
        user=UserResponse.model_validate(new_user),
        csrf_token=csrf_token,
        message="Registration successful"
    )


@router.post("/login", response_model=AuthSessionResponse)
async def login_user(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate with email and password, establishing an httpOnly session cookie with rate limiting."""
    # Apply rate limiting
    auth_rate_limiter.check(request, "login")

    stmt = select(User).where(User.email == payload.email.lower().strip())
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated."
        )

    # Create new session
    session_token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.SESSION_MAX_AGE_SECONDS)
    user_session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=expires_at,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    db.add(user_session)
    await db.commit()

    # Set cookie and issue CSRF token
    _set_session_cookie(response, session_token)
    csrf_token = generate_csrf_token(session_token)

    await record_audit_event(
        db=db,
        user_id=user.id,
        action="login",
        entity_type="user",
        details={"email": user.email}
    )

    logger.info(f"User login successful: {user.email}")
    return AuthSessionResponse(
        user=UserResponse.model_validate(user),
        csrf_token=csrf_token,
        message="Login successful"
    )


@router.post("/logout", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def logout_user(
    response: Response,
    session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db)
):
    """Terminate the current session and remove the session cookie."""
    user_id = session.user_id
    await db.delete(session)
    await db.commit()

    await record_audit_event(
        db=db,
        user_id=user_id,
        action="logout",
        entity_type="user"
    )

    _clear_session_cookie(response)
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=AuthSessionResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    session: UserSession = Depends(get_current_session)
):
    """Return profile for the currently authenticated user with a valid CSRF token."""
    csrf_token = generate_csrf_token(session.session_token)
    return AuthSessionResponse(
        user=UserResponse.model_validate(current_user),
        csrf_token=csrf_token,
        message="Session active"
    )


@router.get("/budget")
async def get_my_budget(
    current_user: User = Depends(get_current_user)
):
    """Return current user's LLM budget usage, remaining balance, and cap status."""
    return get_user_budget_status(current_user.id)


@router.get("/export-data")
async def export_all_user_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """GDPR/CCPA compliant full data export returning complete machine-readable user records."""
    user_id = current_user.id

    prof_stmt = select(CandidateProfile).where(CandidateProfile.user_id == user_id)
    profile = (await db.execute(prof_stmt)).scalar_one_or_none()

    res_stmt = select(Resume).where(Resume.user_id == user_id)
    resumes = (await db.execute(res_stmt)).scalars().all()

    c_stmt = select(Contact).where(Contact.user_id == user_id)
    contacts = (await db.execute(c_stmt)).scalars().all()

    a_stmt = select(ContactAnalysis).where(ContactAnalysis.user_id == user_id)
    analyses = (await db.execute(a_stmt)).scalars().all()

    s_stmt = select(Shortlist).where(Shortlist.user_id == user_id)
    shortlists = (await db.execute(s_stmt)).scalars().all()

    d_stmt = select(MessageDraft).where(MessageDraft.user_id == user_id)
    drafts = (await db.execute(d_stmt)).scalars().all()

    e_stmt = select(OutreachEvent).where(OutreachEvent.user_id == user_id)
    events = (await db.execute(e_stmt)).scalars().all()

    i_stmt = select(Integration).where(Integration.user_id == user_id)
    integrations = (await db.execute(i_stmt)).scalars().all()

    export_payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "headline": current_user.headline,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        },
        "candidate_profile": {
            "target_roles": profile.target_roles if profile else [],
            "target_companies": profile.target_companies if profile else [],
            "target_locations": profile.target_locations if profile else [],
            "skills": profile.skills if profile else [],
            "education": profile.education if profile else [],
            "experience_years": profile.experience_years if profile else 0.0,
            "bio": profile.bio if profile else "",
            "preferences": profile.preferences if profile else {}
        } if profile else None,
        "resumes": [
            {
                "id": r.id,
                "file_name": r.file_name,
                "file_size": r.file_size,
                "mime_type": r.mime_type,
                "parsed_data": r.parsed_data,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in resumes
        ],
        "contacts": [
            {
                "id": c.id,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "company": c.company,
                "position": c.position,
                "email": c.email,
                "profile_url": c.profile_url,
                "connected_on": c.connected_on,
                "notes": c.notes,
                "created_at": c.created_at.isoformat() if c.created_at else None
            } for c in contacts
        ],
        "contact_analyses": [
            {
                "contact_id": a.contact_id,
                "score": a.score,
                "priority": a.priority,
                "confidence": a.confidence,
                "categories": a.categories,
                "reasons": a.reasons,
                "factor_breakdown": a.factor_breakdown,
                "weights_used": a.weights_used
            } for a in analyses
        ],
        "shortlists": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "created_at": s.created_at.isoformat() if s.created_at else None
            } for s in shortlists
        ],
        "message_drafts": [
            {
                "id": d.id,
                "contact_id": d.contact_id,
                "template_type": d.template_type,
                "tone": d.tone,
                "subject": d.subject,
                "body": d.body,
                "status": d.status,
                "character_count": d.character_count,
                "sent_at": d.sent_at.isoformat() if d.sent_at else None
            } for d in drafts
        ],
        "outreach_events": [
            {
                "id": ev.id,
                "contact_id": ev.contact_id,
                "event_type": ev.event_type,
                "status": ev.status,
                "notes": ev.notes,
                "created_at": ev.created_at.isoformat() if ev.created_at else None
            } for ev in events
        ],
        "integrations": [
            {
                "id": i.id,
                "provider": i.provider,
                "account_id": i.account_id,
                "account_email": i.account_email,
                "scopes": i.scopes,
                "is_active": i.is_active,
                "created_at": i.created_at.isoformat() if i.created_at else None
            } for i in integrations
        ]
    }

    await record_audit_event(
        db=db,
        user_id=user_id,
        action="full_data_export",
        entity_type="user_data",
        details={"contacts_count": len(contacts), "resumes_count": len(resumes)}
    )

    json_str = json.dumps(export_payload, indent=2)
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="careerconnect_export_{user_id}.json"'}
    )


@router.delete("/account", response_model=MessageResponse, dependencies=[Depends(verify_csrf)])
async def delete_my_account(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete account, all associated database records (via cascade), and all files in storage."""
    user_id = current_user.id
    email = current_user.email

    await record_audit_event(
        db=db,
        user_id=user_id,
        action="account_delete",
        entity_type="user",
        details={"email": email}
    )

    # 1. Physically delete all user files from isolated storage
    storage = get_storage_service()
    await storage.delete_all_user_files(user_id)

    # 2. Hard delete User entity from DB (cascades sessions, profile, resumes, contacts, analyses, shortlists, drafts, events)
    await db.delete(current_user)
    await db.commit()

    # 3. Clear session cookie
    _clear_session_cookie(response)

    logger.info(f"User account permanently deleted with full data purge: {email}")
    return MessageResponse(message="Account and all associated personal data have been permanently deleted.")


# ==========================================
# LinkedIn OIDC Authorization-Code Flow
# ==========================================

@router.get("/linkedin/authorize")
async def linkedin_authorize(request: Request, response: Response):
    """Initiate LinkedIn OIDC authorization code flow."""
    if not is_linkedin_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Official LinkedIn OAuth app is not configured in this environment."
        )

    state, nonce = generate_oauth_state_and_nonce()
    # Save state and nonce in temporary secure cookie
    response.set_cookie(
        key="oauth_state",
        value=f"{state}:{nonce}",
        max_age=600,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite="lax",
        path="/"
    )
    auth_url = build_authorization_url(state, nonce)

    # If navigated directly via browser (Accept: text/html), redirect immediately
    accept = request.headers.get("accept", "")
    if "text/html" in accept and "application/json" not in accept:
        redirect = RedirectResponse(url=auth_url, status_code=status.HTTP_302_FOUND)
        redirect.set_cookie(
            key="oauth_state",
            value=f"{state}:{nonce}",
            max_age=600,
            httponly=True,
            secure=settings.SECURE_COOKIES,
            samesite="lax",
            path="/"
        )
        return redirect

    return {"authorization_url": auth_url, "state": state}


@router.get("/linkedin/callback")
async def linkedin_callback(
    request: Request,
    response: Response,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Handle callback from LinkedIn OAuth OIDC flow."""
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"LinkedIn authorization error: {error}"
        )

    if not code or not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required code or state parameter."
        )

    # Validate state and nonce from cookie
    oauth_cookie = request.cookies.get("oauth_state")
    if not oauth_cookie or ":" not in oauth_cookie:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state session."
        )

    expected_state, expected_nonce = oauth_cookie.split(":", 1)
    if state != expected_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSRF/State mismatch during LinkedIn authentication."
        )

    try:
        # Clean up state cookie
        response.delete_cookie("oauth_state", path="/")

        # Exchange authorization code for tokens
        try:
            tokens = await exchange_code_for_tokens(code)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Token exchange error: {str(exc)}"
            )

        id_token = tokens.get("id_token")
        access_token = tokens.get("access_token")
        if not id_token or not access_token:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid token response from LinkedIn: missing ID token or access token."
            )

        # Validate ID token claims
        claims = decode_jwt_unverified(id_token)
        if not validate_id_token_claims(claims, settings.LINKEDIN_CLIENT_ID, expected_nonce):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid LinkedIn ID Token claims or nonce mismatch."
            )

        sub = claims["sub"]
        email = claims.get("email")
        name = claims.get("name")

        if not email:
            # Fallback to UserInfo endpoint if email claim was omitted from ID token
            userinfo = await fetch_userinfo(access_token)
            email = userinfo.get("email")
            name = name or userinfo.get("name")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not retrieve verified email address from LinkedIn."
            )

        # Find or create user
        email_clean = email.lower().strip()
        stmt = select(User).where(User.email == email_clean)
        user = (await db.execute(stmt)).scalar_one_or_none()

        if not user:
            # Create user with strong random unusable password hash
            random_pwd = secrets.token_urlsafe(32)
            user = User(
                email=email_clean,
                password_hash=hash_password(random_pwd),
                full_name=name,
                is_active=True
            )
            db.add(user)
            await db.flush()

        # Store encrypted integration tokens at rest (AES/Fernet)
        int_stmt = select(Integration).where(
            Integration.user_id == user.id,
            Integration.provider == "linkedin"
        )
        integration = (await db.execute(int_stmt)).scalar_one_or_none()

        expires_in = tokens.get("expires_in", 5184000)  # Default 60 days
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        enc_access = encrypt_token(access_token)
        enc_refresh = encrypt_token(tokens.get("refresh_token", ""))

        if integration:
            integration.access_token_enc = enc_access
            integration.refresh_token_enc = enc_refresh
            integration.token_expires_at = expires_at
            integration.account_id = sub
            integration.account_email = email_clean
            integration.is_active = True
        else:
            integration = Integration(
                user_id=user.id,
                provider="linkedin",
                access_token_enc=enc_access,
                refresh_token_enc=enc_refresh,
                token_expires_at=expires_at,
                scopes="openid profile email",
                account_id=sub,
                account_email=email_clean,
                is_active=True
            )
            db.add(integration)

        # Establish authenticated session
        session_token = generate_session_token()
        session_exp = datetime.now(timezone.utc) + timedelta(seconds=settings.SESSION_MAX_AGE_SECONDS)
        user_session = UserSession(
            user_id=user.id,
            session_token=session_token,
            expires_at=session_exp,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        db.add(user_session)
        await db.commit()

        # Issue session cookie and redirect to dashboard
        redirect = RedirectResponse(url=f"{settings.FRONTEND_URL}/overview", status_code=status.HTTP_302_FOUND)
        _set_session_cookie(redirect, session_token)
        return redirect
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Unexpected error in linkedin_callback: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LinkedIn authentication processing error: {str(exc)}"
        )

