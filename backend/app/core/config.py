"""Application configuration loaded from environment variables using Pydantic v2."""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Configuration settings for CareerConnect AI."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_NAME: str = "CareerConnect AI"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"

    # Security & Sessions
    # 32+ character secret for HMAC, signing, CSRF
    SECRET_KEY: str = Field(
        default="careerconnect_dev_secret_key_32_bytes_super_secure_for_dev_mode_only",
        description="Secret key for signing and CSRF tokens"
    )
    # Fernet key (32 url-safe base64-encoded bytes)
    # Default provided for out-of-the-box local development
    ENCRYPTION_KEY: str = Field(
        default="e2N3RXZnN3I0SmtjVUp4b2p4VlhXWGpnVlp4cE5TbzE=",
        description="Fernet symmetric encryption key for encrypting sensitive tokens at rest"
    )
    SESSION_COOKIE_NAME: str = "careerconnect_session"
    SESSION_MAX_AGE_SECONDS: int = 7 * 24 * 3600  # 7 days
    SECURE_COOKIES: bool = False  # Set to True in production (HTTPS)
    SAME_SITE_COOKIE: str = "lax"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://careerconnect:careerconnect_dev_password@127.0.0.1:5432/careerconnect_dev"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Storage
    STORAGE_BACKEND: str = "local"  # "local" or "s3"
    LOCAL_STORAGE_PATH: str = "./data/private_storage"
    S3_BUCKET_NAME: Optional[str] = None
    S3_REGION: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_ENDPOINT_URL: Optional[str] = None

    # LLM Settings
    LLM_PROVIDER: str = "gemini"  # "gemini", "openai", "mock"
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    LLM_MODEL_NAME: str = "gemini-1.5-flash"
    LLM_TEMPERATURE: float = 0.3
    LLM_MAX_RETRIES: int = 1
    LLM_USER_BUDGET_CAP_USD: float = 1.00  # Per-user budget cap in USD
    LLM_ESTIMATED_COST_PER_CALL_USD: float = 0.005  # Estimated cost per extraction/analysis call

    # LinkedIn OAuth Settings
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/linkedin/callback"

    # Resume & Antivirus Settings
    MAX_RESUME_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    CLAMAV_ENABLED: bool = False
    CLAMAV_HOST: str = "127.0.0.1"
    CLAMAV_PORT: int = 3310


settings = Settings()
