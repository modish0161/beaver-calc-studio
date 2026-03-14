"""
conftest — Shared fixtures for backend tests
"""
import os
import pytest

# Set test environment variables before importing the app
os.environ.setdefault("FLASK_ENV", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")


@pytest.fixture
def app():
    """Create application for testing."""
    from app import create_app

    app, _socketio = create_app()
    app.config["TESTING"] = True
    yield app


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()
