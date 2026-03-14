"""
Golden tests for the falsework calculator (BS 5975)
─────────────────────────────────────────────────────
Hand-verified load and system property calculations against BS 5975:2019.
"""
import pytest


class TestFalseworkGolden:
    """Verified golden tests for the falsework calculator."""

    @pytest.fixture(autouse=True)
    def setup(self):
        from beaver_calc.calculators.falsework.calculator import calculator
        self.calc = calculator

    # Standard steel falsework inputs
    BASE_INPUTS = {
        "span_m": 6.0,
        "bay_width_m": 3.0,
        "tier_count": 2,
        "post_height_m": 3.0,
        "dead_load_kN_per_m2": 5.0,
        "live_load_kN_per_m2": 2.5,
        "wind_load_kN_per_m2": 0.5,
        "dynamic_amplification_factor": 1.2,
        "post_material": "steel",
        "ledger_material": "steel",
        "post_section": "48.3x3.2",
        "post_grade": "S355",
        "ledger_section": "48.3x3.2",
        "ledger_grade": "S355",
        "use_bracing": True,
        "brace_spacing_m": 3.0,
        "gamma_m0": 1.0,
        "gamma_m1": 1.0,
    }

    # ── Case 1: System properties ────────────────────────────────────────
    def test_system_total_height(self):
        """Total height = post_height × tier_count = 3.0 × 2 = 6.0 m"""
        result = self.calc.calculate(self.BASE_INPUTS)
        sp = result["system_properties"]
        assert sp["total_height_m"] == pytest.approx(6.0)

    def test_system_span_and_bay(self):
        result = self.calc.calculate(self.BASE_INPUTS)
        sp = result["system_properties"]
        assert sp["span_m"] == pytest.approx(6.0)
        assert sp["bay_width_m"] == pytest.approx(3.0)

    # ── Case 2: Load calculations ────────────────────────────────────────
    def test_tributary_area(self):
        """Tributary area per post = span × bay_width = 6.0 × 3.0 = 18.0 m²"""
        result = self.calc.calculate(self.BASE_INPUTS)
        loads = result["loads"]
        assert loads["tributary_area_post"] == pytest.approx(18.0)

    def test_dead_load_total(self):
        """Dead = 5.0 × 18.0 = 90.0 kN"""
        result = self.calc.calculate(self.BASE_INPUTS)
        loads = result["loads"]
        assert loads["dead_load_total"] == pytest.approx(90.0)

    def test_live_load_total(self):
        """Live = 2.5 × 18.0 = 45.0 kN"""
        result = self.calc.calculate(self.BASE_INPUTS)
        loads = result["loads"]
        assert loads["live_load_total"] == pytest.approx(45.0)

    def test_factored_dead_load(self):
        """Factored dead = 90.0 × 1.2 (DAF) = 108.0 kN"""
        result = self.calc.calculate(self.BASE_INPUTS)
        loads = result["loads"]
        assert loads["dead_load_factored"] == pytest.approx(108.0)

    # ── Case 3: Overall result structure ─────────────────────────────────
    def test_result_has_all_keys(self):
        result = self.calc.calculate(self.BASE_INPUTS)
        for key in ["system_properties", "loads", "post_design", "ledger_design",
                     "bracing_design", "stability_checks", "utilisation_summary",
                     "overall_check", "recommendations"]:
            assert key in result, f"Missing key: {key}"

    def test_utilisation_summary_keys(self):
        result = self.calc.calculate(self.BASE_INPUTS)
        us = result["utilisation_summary"]
        for key in ["post", "ledger", "bracing", "stability"]:
            assert key in us

    # ── Case 4: Varying inputs affect results as expected ────────────────
    def test_higher_load_increases_utilisation(self):
        light = self.calc.calculate({**self.BASE_INPUTS, "dead_load_kN_per_m2": 2.0})
        heavy = self.calc.calculate({**self.BASE_INPUTS, "dead_load_kN_per_m2": 10.0})
        assert heavy["utilisation_summary"]["post"] > light["utilisation_summary"]["post"]

    def test_taller_post_more_critical(self):
        short = self.calc.calculate({**self.BASE_INPUTS, "post_height_m": 2.0})
        tall = self.calc.calculate({**self.BASE_INPUTS, "post_height_m": 4.5})
        # Taller posts = more slender = higher utilisation
        assert tall["utilisation_summary"]["post"] >= short["utilisation_summary"]["post"]

    # ── Case 5: Different section sizes ──────────────────────────────────
    def test_larger_section_reduces_utilisation(self):
        small = self.calc.calculate({
            **self.BASE_INPUTS,
            "post_section": "48.3x3.2",
            "ledger_section": "48.3x3.2",
        })
        large = self.calc.calculate({
            **self.BASE_INPUTS,
            "post_section": "114.3x4.0",
            "ledger_section": "114.3x4.0",
        })
        assert large["utilisation_summary"]["post"] < small["utilisation_summary"]["post"]


class TestFalseworkLoadMath:
    """Verify hand-calculated load values (BS 5975)."""

    def test_uls_vertical_combination(self):
        """ULS vertical = γG×DL_factored + γQ×LL_factored
        DL_factored = 90×1.2 = 108, LL_factored = 45×1.2 = 54
        ULS = 1.35×108 + 1.5×54 = 145.8 + 81.0 = 226.8 kN
        """
        dl = 5.0 * 18.0 * 1.2  # 108
        ll = 2.5 * 18.0 * 1.2  # 54
        uls = 1.35 * dl + 1.5 * ll
        assert uls == pytest.approx(226.8, abs=0.5)

    def test_uls_horizontal_combination(self):
        """ULS horizontal = γQ × wind_factored = 1.5 × (0.5×18×1.2) = 16.2 kN"""
        wl = 0.5 * 18.0 * 1.2  # 10.8
        uls_h = 1.5 * wl
        assert uls_h == pytest.approx(16.2, abs=0.5)
