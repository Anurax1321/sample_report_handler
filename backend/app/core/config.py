from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sample Report Handler API"
    CORS_ORIGINS: str = "http://localhost:5173"
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./dev.db"  # local default

    class Config:
        env_file = ".env"

settings = Settings()
