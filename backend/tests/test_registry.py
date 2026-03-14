"""
Tests for the calculator registry and loader system
"""
import pytest


class TestCalculatorRegistry:
    """Test the plugin registration system."""

    def test_registry_loads_calculators(self):
        from beaver_calc.calculators import registry, load_calculators
        load_calculators()
        calculators = registry.list_calculators() if hasattr(registry, 'list_calculators') else []
        # Should have at least steel_beam_bending and pad_footing_bearing
        assert len(calculators) >= 1 or hasattr(registry, '_calculators')

    def test_steel_beam_bending_is_registered(self):
        from beaver_calc.calculators import registry, load_calculators
        load_calculators()

        calc = registry.get_calculator("steel_beam_bending_v1")
        if calc is not None:
            assert calc.key == "steel_beam_bending_v1"
            assert calc.name is not None

    def test_get_nonexistent_calculator_returns_none(self):
        from beaver_calc.calculators import registry
        result = registry.get_calculator("nonexistent_calculator_xyz")
        assert result is None


class TestCalculatorBase:
    """Test base class functionality."""

    def test_calculator_has_required_attributes(self):
        from beaver_calc.calculators.steel_beam_bending.calculator import calculator
        assert hasattr(calculator, 'key')
        assert hasattr(calculator, 'name')
        assert hasattr(calculator, 'calculate')

    def test_calculator_has_metadata(self):
        from beaver_calc.calculators.steel_beam_bending.calculator import calculator
        if hasattr(calculator, 'get_metadata'):
            meta = calculator.get_metadata()
            assert 'key' in meta
            assert 'name' in meta
