"""
Calculator framework and plugin system
"""
from .base import CalculatorPlugin, CalculatorRegistry, registry
from .loader import load_calculators

__all__ = ['CalculatorPlugin', 'CalculatorRegistry', 'registry', 'load_calculators']
