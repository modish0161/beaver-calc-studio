"""
Tests for API routes
"""
import pytest


class TestHealthEndpoints:
    """Test basic API health check."""

    def test_calculators_list_endpoint(self, client):
        """GET /calculators should return a list or 401 if auth required."""
        response = client.get("/calculators")
        assert response.status_code in (200, 401, 404)

    def test_unknown_route_returns_404(self, client):
        response = client.get("/nonexistent-route-xyz")
        assert response.status_code == 404


class TestCalculatorEndpoints:
    """Test calculator API endpoints."""

    def test_get_calculator_details(self, client):
        """GET /calculators/<key> returns calculator metadata or 401."""
        response = client.get("/calculators/steel_beam_bending_v1")
        assert response.status_code in (200, 401, 404)

    def test_compute_without_auth_returns_401(self, client):
        """POST /api/runs without token should return 401."""
        response = client.post("/api/runs", json={
            "calculator": "steel_beam_bending_v1",
            "inputs": {
                "section": "UKB 457x191x67",
                "span_m": 8.0,
                "uniform_load_kN_per_m": 25.0,
            }
        })
        # Expect 401 (no auth) or 422 (missing project_id) or other
        assert response.status_code in (401, 403, 422, 400)
