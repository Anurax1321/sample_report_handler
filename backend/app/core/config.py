import os

from pydantic_settings import BaseSettings
from typing import List

# Generate a random secret for dev so we never ship a hardcoded credential.
# In production, set JWT_SECRET_KEY explicitly via .env or environment variable.
# NOTE: tokens are invalidated on every restart when using this fallback.
_DEFAULT_JWT_SECRET = os.urandom(32).hex()


class Settings(BaseSettings):
    PROJECT_NAME: str = "Sample Report Handler API"
    CORS_ORIGINS: str = "http://localhost:5175,http://localhost:3002,http://localhost:8080"

    # Default DB URI targets the local dev Postgres instance.
    # Override via SQLALCHEMY_DATABASE_URI in .env for production.
    SQLALCHEMY_DATABASE_URI: str = "postgresql://sample_user:sample_pass@localhost:5434/sample_report_db"

    # JWT Auth
    JWT_SECRET_KEY: str = _DEFAULT_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    class Config:
        env_file = ".env"

    def get_cors_origins(self) -> List[str]:
        """Parse CORS_ORIGINS string into list of allowed origins."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(',')]

settings = Settings()
