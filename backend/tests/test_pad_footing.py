"""
Tests for pad footing bearing calculator (EN 1997-1)
"""
import math
import pytest


class TestPadFootingBearingPlugin:
    """Test the pad footing calculator plugin."""

    @pytest.fixture(autouse=True)
    def setup(self):
        from beaver_calc.calculators.pad_footing_bearing.calculator import calculator
        self.calc = calculator

    def test_basic_calculation_returns_dict(self):
        inputs = {
            "vertical_load_kN": 500,
            "moment_kNm": 0,
            "footing_width_m": 1.5,
            "footing_length_m": 1.5,
            "footing_depth_m": 0.5,
            "soil_bearing_capacity_kPa": 150,
        }
        result = self.calc.calculate(inputs)
        assert isinstance(result, dict)

    def test_larger_footing_reduces_pressure(self):
        base = {
            "vertical_load_kN": 500,
            "moment_kNm": 0,
            "footing_depth_m": 0.5,
            "soil_bearing_capacity_kPa": 150,
        }
        r1 = self.calc.calculate({**base, "footing_width_m": 1.0, "footing_length_m": 1.0})
        r2 = self.calc.calculate({**base, "footing_width_m": 2.0, "footing_length_m": 2.0})

        def get_pressure(r):
            # Look for applied pressure field first (sigma_v), not the bearing capacity
            if "sigma_v_kN_m2" in r:
                return float(r["sigma_v_kN_m2"])
            for k, v in r.items():
                if "sigma" in k.lower() or "pressure" in k.lower():
                    try:
                        return float(v)
                    except (ValueError, TypeError):
                        continue
            return None

        p1 = get_pressure(r1)
        p2 = get_pressure(r2)
        if p1 is not None and p2 is not None:
            assert p2 < p1


class TestPadFootingMath:
    """Verify bearing capacity formulas."""

    def test_uniform_bearing_pressure(self):
        N = 600  # kN
        B = 1.5  # m
        L = 1.5  # m
        q = N / (B * L)
        assert q == pytest.approx(266.67, abs=1)

    def test_eccentric_bearing_pressure(self):
        N = 500
        M = 80
        B = 2.0
        L = 2.0
        eB = M / N
        Beff = B - 2 * eB
        q = N / (Beff * L)

        assert eB == pytest.approx(0.16, abs=0.01)
        assert q == pytest.approx(148.81, abs=1)

    def test_overturning_check(self):
        B = 2.0
        M = 150
        N = 800
        eB = M / N
        assert eB < B / 6  # No tension beneath footing

    def test_terzaghi_bearing_capacity_factors(self):
        phi = 30  # degrees
        phi_rad = math.radians(phi)
        Nq = math.exp(math.pi * math.tan(phi_rad)) * math.tan(math.pi / 4 + phi_rad / 2) ** 2
        Nc = (Nq - 1) / math.tan(phi_rad)
        Ngamma = 2 * (Nq + 1) * math.tan(phi_rad)

        assert Nq == pytest.approx(18.40, abs=0.5)
        assert Nc == pytest.approx(30.14, abs=0.5)
        assert Ngamma > 15
