from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "DC Dashboard API"
    app_version: str = "1.0.0"
    debug: bool = False

    # Oracle Database
    oracle_user: str
    oracle_password: str
    oracle_host: str
    oracle_port: int = 1521
    oracle_service: str

    @property
    def oracle_dsn(self) -> str:
        """Construct Oracle DSN string."""
        return f"{self.oracle_host}:{self.oracle_port}/{self.oracle_service}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
