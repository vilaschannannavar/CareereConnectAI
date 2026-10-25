"""CareerConnect AI FastAPI Application Entrypoint."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.db.session import engine
from app.db.base import Base
# Import all models so they are registered with Base.metadata
import app.models  # noqa: F401
from app.api.v1.auth import router as auth_router
from app.api.v1.capabilities import router as capabilities_router
from app.api.v1.candidate_profile import router as candidate_profile_router
from app.api.v1.resumes import router as resumes_router
from app.api.v1.contacts import router as contacts_router
from app.api.v1.integrations import router as integrations_router
from app.api.v1.scoring import router as scoring_router
from app.api.v1.shortlists import router as shortlists_router
from app.api.v1.messages import router as messages_router
from app.api.v1.tracker import router as tracker_router
from app.api.v1.audit import router as audit_router
from app.api.v1.openings import router as openings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown routines."""
    setup_logging(settings.LOG_LEVEL)
    logger.info(f"Starting {settings.APP_NAME} in {settings.ENVIRONMENT} mode")

    # In development or testing with sqlite or local fallback, ensure tables are present
    if "sqlite" in settings.DATABASE_URL:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schemas initialized (SQLite mode).")
    
    yield

    logger.info("Shutting down CareerConnect AI backend.")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="Privacy-compliant CareerConnect AI backend server.",
    lifespan=lifespan
)

# CORS configuration allowing frontend origin with cookies/credentials
frontend_origin = settings.FRONTEND_URL.rstrip("/")
origins = list(dict.fromkeys(filter(None, [
    frontend_origin,
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
])))

from app.core.security_headers import SecurityHeadersMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
app.add_middleware(SecurityHeadersMiddleware)

# Include API Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api")  # Supports /api/auth/me
app.include_router(capabilities_router, prefix="/api/v1")
app.include_router(capabilities_router, prefix="/api/integrations")
app.include_router(candidate_profile_router, prefix="/api/v1")
app.include_router(resumes_router, prefix="/api/v1")
app.include_router(contacts_router, prefix="/api/v1")
app.include_router(integrations_router, prefix="/api/v1")
app.include_router(scoring_router, prefix="/api/v1")
app.include_router(shortlists_router, prefix="/api/v1")
app.include_router(messages_router, prefix="/api/v1")
app.include_router(tracker_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
app.include_router(openings_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint welcoming API consumers and linking to frontend and docs."""
    return {
        "message": f"Welcome to {settings.APP_NAME} Backend API",
        "frontend_app": settings.FRONTEND_URL,
        "docs_url": "/docs",
        "health_url": "/health",
        "status": "online"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Service health and readiness probe."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT
    }

