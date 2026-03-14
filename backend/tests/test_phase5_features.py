"""
Tests for Phase 5 features: DXF export, XLSX export, Sign-off workflow, WebSocket events.
"""
import pytest
from werkzeug.security import generate_password_hash


# ── fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def seeded_app(app):
    """App with users, a project, calculators, and a completed run."""
    from beaver_calc.extensions import db
    from beaver_calc.models import User, Project, Calculator, Run

    with app.app_context():
        app.config["JWT_SECRET_KEY"] = "test-jwt-secret"
        app.config["SECRET_KEY"] = "test-secret-key"

        db.drop_all()
        db.create_all()

        admin = User(
            email="admin@test.com",
            password_hash=generate_password_hash("Admin123!"),
            first_name="Admin", last_name="User",
            role="admin", is_active=True,
        )
        designer = User(
            email="designer@test.com",
            password_hash=generate_password_hash("Design123!"),
            first_name="Des", last_name="Eng",
            role="designer", is_active=True,
        )
        checker = User(
            email="checker@test.com",
            password_hash=generate_password_hash("Check123!"),
            first_name="Chk", last_name="Eng",
            role="checker", is_active=True,
        )
        db.session.add_all([admin, designer, checker])
        db.session.flush()

        project = Project(name="Test Project", created_by_id=admin.id)
        db.session.add(project)
        db.session.flush()

        calc = Calculator(
            key="pad_footing_bearing_v1",
            name="Pad Footing Bearing Check",
            version="1.0.0",
            category="geotechnical",
            is_active=True,
            input_schema={"type": "object", "properties": {}},
            output_schema={"type": "object", "properties": {}},
        )
        db.session.add(calc)
        db.session.flush()

        run = Run(
            run_id="test-run-001",
            project_id=project.id,
            calculator_id=calc.id,
            user_id=admin.id,
            status="completed",
            inputs={
                "footing_length_m": 2.5,
                "footing_width_m": 2.0,
                "vertical_load_kN": 600,
            },
            results={
                "footing_area_m2": 5.0,
                "sigma_v_kN_m2": 120.0,
                "bearing_capacity_kN_m2": 200.0,
                "utilisation_bearing": 0.6,
                "bearing_check": "PASS",
                "sliding_resistance_kN": 150.0,
                "utilisation_sliding": 0.4,
                "sliding_check": "PASS",
                "overall_check": "PASS",
            },
            run_hash="abc123hash",
        )
        # Also add a 'running' run to test sign-off rejection
        run_in_progress = Run(
            run_id="test-run-002",
            project_id=project.id,
            calculator_id=calc.id,
            user_id=admin.id,
            status="running",
            inputs={"footing_length_m": 1.0},
            results=None,
        )
        db.session.add_all([run, run_in_progress])
        db.session.commit()

        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(seeded_app):
    return seeded_app.test_client()


def _login(client, email, password):
    resp = client.post("/auth/login", json={"email": email, "password": password})
    return resp.get_json()["access_token"]


def _admin_token(client):
    return _login(client, "admin@test.com", "Admin123!")


def _designer_token(client):
    return _login(client, "designer@test.com", "Design123!")


def _checker_token(client):
    return _login(client, "checker@test.com", "Check123!")


# ── DXF export tests ────────────────────────────────────────────────────

class TestDXFExport:
    def test_dxf_export_returns_file(self, client):
        token = _admin_token(client)
        resp = client.get(
            "/api/runs/test-run-001/report/dxf",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.content_type == "application/dxf"
        assert b"SECTION" in resp.data  # DXF files contain SECTION markers

    def test_dxf_export_404_missing_run(self, client):
        token = _admin_token(client)
        resp = client.get(
            "/api/runs/nonexistent/report/dxf",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    def test_dxf_export_requires_auth(self, client):
        resp = client.get("/api/runs/test-run-001/report/dxf")
        assert resp.status_code == 401


# ── XLSX export tests ───────────────────────────────────────────────────

class TestXLSXExport:
    def test_xlsx_export_returns_file(self, client):
        token = _admin_token(client)
        resp = client.get(
            "/api/runs/test-run-001/report/xlsx",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert "spreadsheet" in resp.content_type
        # XLSX files start with PK zip signature
        assert resp.data[:2] == b"PK"

    def test_xlsx_export_404_missing_run(self, client):
        token = _admin_token(client)
        resp = client.get(
            "/api/runs/nonexistent/report/xlsx",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    def test_xlsx_export_requires_auth(self, client):
        resp = client.get("/api/runs/test-run-001/report/xlsx")
        assert resp.status_code == 401


# ── Sign-off workflow tests ─────────────────────────────────────────────

class TestSignOffWorkflow:
    def test_designer_signoff(self, client):
        token = _designer_token(client)
        resp = client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "designer", "comment": "Design complete"},
        )
        assert resp.status_code == 201
        assert resp.get_json()["signoff"]["role"] == "designer"

    def test_checker_needs_designer_first(self, client):
        """Checker cannot sign off before designer."""
        token = _checker_token(client)
        resp = client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "checker"},
        )
        assert resp.status_code == 400
        assert "Designer must sign off" in resp.get_json()["error"]

    def test_checker_after_designer(self, client):
        """Full designer → checker flow."""
        dtok = _designer_token(client)
        client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {dtok}"},
            json={"role": "designer"},
        )
        ctok = _checker_token(client)
        resp = client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {ctok}"},
            json={"role": "checker", "comment": "Checked OK"},
        )
        assert resp.status_code == 201

    def test_approver_after_checker(self, client):
        """Full designer → checker → approver flow."""
        dtok = _designer_token(client)
        client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {dtok}"},
            json={"role": "designer"},
        )
        ctok = _checker_token(client)
        client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {ctok}"},
            json={"role": "checker"},
        )
        atok = _admin_token(client)
        resp = client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {atok}"},
            json={"role": "approver"},
        )
        assert resp.status_code == 201

    def test_duplicate_signoff_rejected(self, client):
        """Same role cannot sign off twice."""
        dtok = _designer_token(client)
        client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {dtok}"},
            json={"role": "designer"},
        )
        resp = client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {dtok}"},
            json={"role": "designer"},
        )
        assert resp.status_code == 409

    def test_cannot_signoff_running_run(self, client):
        """Only completed runs can be signed off."""
        token = _designer_token(client)
        resp = client.post(
            "/api/runs/test-run-002/signoffs",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "designer"},
        )
        assert resp.status_code == 400

    def test_invalid_role_rejected(self, client):
        token = _designer_token(client)
        resp = client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "manager"},
        )
        assert resp.status_code == 400

    def test_list_signoffs(self, client):
        """GET lists all sign-offs for a run."""
        dtok = _designer_token(client)
        client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {dtok}"},
            json={"role": "designer"},
        )
        token = _admin_token(client)
        resp = client.get(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        signoffs = resp.get_json()["signoffs"]
        assert len(signoffs) >= 1
        assert signoffs[0]["role"] == "designer"

    def test_designer_cannot_sign_as_approver(self, client):
        """Role permission enforcement: designer cannot sign as approver."""
        token = _designer_token(client)
        # First add designer sign-off
        client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "designer"},
        )
        # Designer should not be able to sign as checker
        resp = client.post(
            "/api/runs/test-run-001/signoffs",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "checker"},
        )
        assert resp.status_code == 403

    def test_signoff_requires_auth(self, client):
        resp = client.post("/api/runs/test-run-001/signoffs", json={"role": "designer"})
        assert resp.status_code == 401


# ── WebSocket events module tests ───────────────────────────────────────

class TestWebSocketModule:
    """Unit-test that the events module imports and helpers work."""

    def test_events_module_imports(self):
        from beaver_calc.events import register_events, emit_run_progress, emit_run_completed, emit_run_failed
        assert callable(register_events)
        assert callable(emit_run_progress)
        assert callable(emit_run_completed)
        assert callable(emit_run_failed)

    def test_socketio_registered_on_app(self, seeded_app):
        with seeded_app.app_context():
            assert 'socketio' in seeded_app.extensions
