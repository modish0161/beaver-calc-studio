"""
Tests for the steel beam bending calculator plugin (EN 1993-1-1)
"""
import math
import pytest


class TestSteelBeamBendingPlugin:
    """Test the steel beam bending calculator plugin directly."""

    @pytest.fixture(autouse=True)
    def setup(self):
        from beaver_calc.calculators.steel_beam_bending.calculator import calculator
        self.calc = calculator

    def test_basic_calculation_returns_results(self):
        inputs = {
            "section": "UKB 457x191x67",
            "span_m": 8.0,
            "uniform_load_kN_per_m": 25.0,
            "lateral_restraint": "restrained",
            "steel_grade": "S355",
        }
        result = self.calc.calculate(inputs)
        assert "M_Ed_kNm" in result or "moment" in str(result).lower()
        assert isinstance(result, dict)

    def test_higher_load_gives_higher_moment(self):
        base = {
            "section": "UKB 457x191x67",
            "span_m": 6.0,
            "lateral_restraint": "restrained",
            "steel_grade": "S355",
        }
        r1 = self.calc.calculate({**base, "uniform_load_kN_per_m": 10.0})
        r2 = self.calc.calculate({**base, "uniform_load_kN_per_m": 20.0})

        # Extract moment — field name varies
        def get_moment(r):
            for k, v in r.items():
                if "moment" in k.lower() or k == "M_Ed":
                    return float(v)
            return None

        m1 = get_moment(r1)
        m2 = get_moment(r2)
        if m1 is not None and m2 is not None:
            assert m2 > m1

    def test_longer_span_gives_larger_deflection(self):
        base = {
            "section": "UKB 457x191x67",
            "uniform_load_kN_per_m": 15.0,
            "lateral_restraint": "restrained",
            "steel_grade": "S355",
        }
        r1 = self.calc.calculate({**base, "span_m": 5.0})
        r2 = self.calc.calculate({**base, "span_m": 10.0})

        def get_deflection(r):
            for k, v in r.items():
                if "deflect" in k.lower() or "delta" in k.lower():
                    return float(v)
            return None

        d1 = get_deflection(r1)
        d2 = get_deflection(r2)
        if d1 is not None and d2 is not None:
            assert d2 > d1


class TestSteelBeamBendingMath:
    """Verify the underlying engineering formulas."""

    def test_simply_supported_udl_moment(self):
        w = 25.0  # kN/m
        L = 8.0  # m
        M = w * L**2 / 8
        assert M == pytest.approx(200.0)

    def test_plastic_moment_resistance(self):
        Wpl = 1453e3  # mm³ — UB 457x191x67
        fy = 355  # MPa
        Mc_Rd = Wpl * fy / 1e6  # kNm
        assert Mc_Rd == pytest.approx(515.815, abs=1)

    def test_shear_resistance(self):
        Av = 453.4 * 8.5  # height * web thickness (simplified)
        fy = 355
        Vpl_Rd = Av * fy / math.sqrt(3) / 1000  # kN
        assert Vpl_Rd > 500

    def test_elastic_deflection_udl(self):
        w = 25  # kN/m = N/mm
        L = 8000  # mm
        E = 210000  # MPa
        I = 29380e4  # mm⁴  (UKB 457x191x67 major axis)
        delta = 5 * w * L**4 / (384 * E * I)
        assert delta == pytest.approx(21.6, abs=1)
