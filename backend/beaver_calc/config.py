"""
Configuration settings for BeaverCalc Studio Backend
"""
import os
import secrets
from typing import Optional

from pydantic_settings import BaseSettings


def _require_secret(env_var: str, fallback_for_dev: bool = False) -> str:
    """Return env var value; in production raise if missing."""
    val = os.getenv(env_var)
    if val:
        return val
    if fallback_for_dev and os.getenv("FLASK_ENV", "development") == "development":
        return secrets.token_hex(32)
    raise RuntimeError(f"{env_var} environment variable must be set in production")


class Config(BaseSettings):
    """Application configuration"""

    # Flask
    SECRET_KEY: str = _require_secret("SECRET_KEY", fallback_for_dev=True)
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    # Database
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///beaver_calc.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # JWT
    JWT_SECRET_KEY: str = _require_secret("JWT_SECRET_KEY", fallback_for_dev=True)
    JWT_ACCESS_TOKEN_EXPIRES: int = 3600  # 1 hour

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # File uploads
    UPLOAD_FOLDER: str = os.getenv("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH: int = 50 * 1024 * 1024  # 50MB

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")

    # Rate limiting
    RATELIMIT_DEFAULT: str = os.getenv("RATELIMIT_DEFAULT", "200 per minute")
    RATELIMIT_STORAGE_URI: str = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

    # OpenAPI
    API_TITLE: str = "BeaverCalc Studio API"
    API_VERSION: str = "v1"
    API_DESCRIPTION: str = "Structural Engineering Calculations Platform"

    class Config:
        env_file = ".env"
        case_sensitive = False


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG: bool = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG: bool = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    WTF_CSRF_ENABLED: bool = False


# Configuration mapping
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config(config_name: Optional[str] = None) -> Config:
    """Get configuration by name"""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    return config.get(config_name, config["default"])()
