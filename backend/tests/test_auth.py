"""
Auth endpoint tests – login, register, /me, error paths
"""
import pytest
from werkzeug.security import generate_password_hash


@pytest.fixture
def seeded_app(app):
    """App with an admin and a regular user pre-seeded."""
    from beaver_calc.extensions import db
    from beaver_calc.models import User

    app.config["JWT_SECRET_KEY"] = "test-jwt-secret"
    app.config["SECRET_KEY"] = "test-secret-key"

    with app.app_context():
        db.create_all()

        admin = User(
            email="admin@test.com",
            password_hash=generate_password_hash("Admin123!"),
            first_name="Admin",
            last_name="User",
            role="admin",
            is_active=True,
        )
        designer = User(
            email="designer@test.com",
            password_hash=generate_password_hash("Design123!"),
            first_name="Design",
            last_name="Engineer",
            role="designer",
            is_active=True,
        )
        disabled = User(
            email="disabled@test.com",
            password_hash=generate_password_hash("Disabled1!"),
            role="viewer",
            is_active=False,
        )
        db.session.add_all([admin, designer, disabled])
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(seeded_app):
    return seeded_app.test_client()


def _login(client, email, password):
    return client.post("/auth/login", json={"email": email, "password": password})


def _admin_token(client):
    resp = _login(client, "admin@test.com", "Admin123!")
    return resp.get_json()["access_token"]


# ── Login ────────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_success(self, client):
        resp = _login(client, "admin@test.com", "Admin123!")
        assert resp.status_code == 200
        body = resp.get_json()
        assert "access_token" in body
        assert body["user"]["email"] == "admin@test.com"
        assert body["user"]["role"] == "admin"

    def test_login_wrong_password(self, client):
        resp = _login(client, "admin@test.com", "wrong")
        assert resp.status_code == 401
        assert "Invalid credentials" in resp.get_json()["error"]

    def test_login_unknown_email(self, client):
        resp = _login(client, "nobody@test.com", "whatever")
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        resp = client.post("/auth/login", json={"email": "admin@test.com"})
        assert resp.status_code == 400

    def test_login_disabled_account(self, client):
        resp = _login(client, "disabled@test.com", "Disabled1!")
        assert resp.status_code == 401
        assert "disabled" in resp.get_json()["error"].lower()


# ── Register (admin-only) ───────────────────────────────────────────────

class TestRegister:
    def test_register_success(self, client):
        token = _admin_token(client)
        resp = client.post(
            "/auth/register",
            json={"email": "new@test.com", "password": "New12345!", "role": "checker"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        body = resp.get_json()
        assert body["user"]["email"] == "new@test.com"
        assert body["user"]["role"] == "checker"

    def test_register_non_admin_forbidden(self, client):
        token = _login(client, "designer@test.com", "Design123!").get_json()["access_token"]
        resp = client.post(
            "/auth/register",
            json={"email": "x@test.com", "password": "X12345!", "role": "viewer"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

    def test_register_duplicate_email(self, client):
        token = _admin_token(client)
        resp = client.post(
            "/auth/register",
            json={"email": "admin@test.com", "password": "dup", "role": "viewer"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 409

    def test_register_invalid_role(self, client):
        token = _admin_token(client)
        resp = client.post(
            "/auth/register",
            json={"email": "inv@test.com", "password": "Inv12345!", "role": "superadmin"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400

    def test_register_missing_fields(self, client):
        token = _admin_token(client)
        resp = client.post(
            "/auth/register",
            json={"email": "miss@test.com"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400


# ── /me endpoint ─────────────────────────────────────────────────────────

class TestMe:
    def test_me_returns_user_info(self, client):
        token = _admin_token(client)
        resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        user = resp.get_json()["user"]
        assert user["email"] == "admin@test.com"
        assert user["first_name"] == "Admin"
        assert user["role"] == "admin"

    def test_me_without_token(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code in (401, 422)
