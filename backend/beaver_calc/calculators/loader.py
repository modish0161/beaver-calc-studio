"""
Calculator plugin loader
"""
import importlib
import pkgutil
from typing import List
import os

from .base import registry


def load_calculators() -> None:
    """
    Load all calculator plugins from the calculators package
    """
    # Get the calculators package path
    calculators_path = os.path.dirname(__file__)

    # Find all subdirectories (each should be a calculator plugin)
    for _, name, is_pkg in pkgutil.iter_modules([calculators_path]):
        if is_pkg and name != '__pycache__':
            try:
                # Import the calculator module
                module = importlib.import_module(f'beaver_calc.calculators.{name}')

                # Check if it has a 'calculator' attribute (the plugin instance)
                if hasattr(module, 'calculator'):
                    calculator = getattr(module, 'calculator')
                    registry.register(calculator)
                    print(f"Loaded calculator: {calculator.key} - {calculator.name}")

            except Exception as e:
                print(f"Failed to load calculator {name}: {e}")
                continue


def get_available_calculators() -> List[str]:
    """Get list of available calculator keys"""
    return registry.get_calculator_keys()
