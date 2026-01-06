from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sample Report Handler API"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080"
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./dev.db"  # local default

    class Config:
        env_file = ".env"

    def get_cors_origins(self) -> List[str]:
        """Parse CORS_ORIGINS string into list of allowed origins."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(',')]

settings = Settings()
