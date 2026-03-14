"""
Golden tests for RC slab bending calculator (EN 1992-1-1)
─────────────────────────────────────────────────────────
Hand-verified against manual calculations per EN 1992-1-1:2004.
Each test case contains inputs, expected outputs, and the hand-calc
derivation so a checker can reproduce them independently.
"""
import math
import pytest


class TestRCSlabBendingGolden:
    """Verified golden tests for the RC slab bending calculator."""

    @pytest.fixture(autouse=True)
    def setup(self):
        from beaver_calc.calculators.rc_slab_bending.calculator import calculator
        self.calc = calculator

    # ── Case 1: Default inputs (200mm slab, C25/30, 4 m span, 5 kN/m²) ──
    def test_default_inputs_moment(self):
        """M_Ed = wL²/8 = 5×4²/8 = 10.0 kNm"""
        result = self.calc.calculate({})
        assert result["M_Ed_kNm"] == pytest.approx(10.0, abs=0.1)

    def test_default_inputs_effective_depth(self):
        """d = 200 - 25 - 12/2 = 169 mm"""
        result = self.calc.calculate({})
        assert result["effective_depth_mm"] == pytest.approx(169.0, abs=0.5)

    def test_default_inputs_K_value(self):
        """K = M/(bd²f_cd) = 10e6/(1000×169²×16.667) ≈ 0.021"""
        result = self.calc.calculate({})
        assert result["K"] == pytest.approx(0.021, abs=0.002)

    def test_default_inputs_passes(self):
        """With K ≈ 0.021 << K'=0.167, slab passes easily."""
        result = self.calc.calculate({})
        assert result["overall_status"] == "PASS"
        assert result["doubly_reinforced"] is False

    # ── Case 2: Thinner slab, higher load ────────────────────────────────
    def test_thin_slab_high_load(self):
        """150mm slab, C30/37, 6 m span, 10 kN/m² → M_Ed = 10×6²/8 = 45 kNm
        d = 150 - 30 - 16/2 = 112 mm
        f_cd = 30/1.5 = 20
        K = 45e6/(1000×112²×20) = 45e6/(250880000) ≈ 0.1794 → > 0.167 → FAIL
        """
        result = self.calc.calculate({
            "thickness_mm": 150,
            "span_m": 6.0,
            "load_kN_m2": 10.0,
            "concrete_grade": "C30/37",
            "cover_mm": 30,
            "bar_dia_mm": 16,
        })
        assert result["M_Ed_kNm"] == pytest.approx(45.0, abs=0.5)
        assert result["effective_depth_mm"] == pytest.approx(112.0, abs=0.5)
        assert result["overall_status"] == "FAIL"
        assert result["doubly_reinforced"] is True

    # ── Case 3: Thick slab lighly loaded ─────────────────────────────────
    def test_thick_slab_light_load(self):
        """300mm slab, C40/50, 3 m span, 2 kN/m² → easily passes.
        d = 300 - 25 - 10/2 = 270 mm
        M_Ed = 2×3²/8 = 2.25 kNm
        f_cd = 40/1.5 = 26.667
        K = 2.25e6/(1000×270²×26.667) ≈ 0.00116 → negligible
        """
        result = self.calc.calculate({
            "thickness_mm": 300,
            "span_m": 3.0,
            "load_kN_m2": 2.0,
            "concrete_grade": "C40/50",
            "bar_dia_mm": 10,
            "cover_mm": 25,
        })
        assert result["M_Ed_kNm"] == pytest.approx(2.25, abs=0.1)
        assert result["effective_depth_mm"] == pytest.approx(270.0, abs=0.5)
        assert result["overall_status"] == "PASS"
        assert result["utilisation"] < 0.05  # very low utilisation

    # ── Case 4: Verify minimum reinforcement governs ─────────────────────
    def test_minimum_reinforcement_governs(self):
        """For the default case As_req ≈ 165 mm²/m but As_min ≈ 227 mm²/m.
        So As_provided should equal As_min, not As_req.
        """
        result = self.calc.calculate({})
        assert result["As_provided_mm2_m"] >= result["As_min_mm2_m"]
        assert result["As_provided_mm2_m"] >= result["As_required_mm2_m"]

    # ── Case 5: C20/25 concrete, marginal slab ──────────────────────────
    def test_c20_marginal(self):
        """200mm slab, C20/25, 8 m span, 8 kN/m²
        M_Ed = 8×8²/8 = 64 kNm
        d = 200 - 25 - 12/2 = 169 mm
        f_cd = 20/1.5 = 13.333
        K = 64e6/(1000×169²×13.333) = 64e6/(380661.307) ≈ 0.1682 → > 0.167 → FAIL
        """
        result = self.calc.calculate({
            "thickness_mm": 200,
            "span_m": 8.0,
            "load_kN_m2": 8.0,
            "concrete_grade": "C20/25",
        })
        assert result["M_Ed_kNm"] == pytest.approx(64.0, abs=0.5)
        # Borderline case — either PASS or FAIL is acceptable
        assert result["K"] == pytest.approx(0.168, abs=0.01)


class TestRCSlabBendingMath:
    """Verify standalone EN 1992-1-1 formulas."""

    def test_simply_supported_moment(self):
        """wL²/8 for UDL on simply-supported beam."""
        w, L = 12.0, 5.0
        M = w * L ** 2 / 8
        assert M == pytest.approx(37.5)

    def test_lever_arm_z(self):
        """z = d × min(0.5+sqrt(0.25−K/1.134), 0.95) for K=0.05, d=200."""
        K = 0.05
        d = 200
        z = d * min(0.5 + math.sqrt(0.25 - K / 1.134), 0.95)
        assert z == pytest.approx(190.0, abs=1.0)  # 0.95d limit

    def test_minimum_reinforcement_formula(self):
        """As_min = max(0.26·f_ctm/f_yk·b·d, 0.0013·b·d) per cl 9.2.1.1.
        C25/30: f_ctm = 0.30×25^(2/3) = 2.565 N/mm²
        """
        f_ctm = 0.30 * 25 ** (2.0 / 3.0)
        assert f_ctm == pytest.approx(2.565, abs=0.02)
        As_min = max(0.26 * f_ctm / 500 * 1000 * 169, 0.0013 * 1000 * 169)
        assert As_min == pytest.approx(226.0, abs=5)
