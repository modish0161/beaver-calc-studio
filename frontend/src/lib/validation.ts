/**
 * Shared validation utilities for structural engineering calculator inputs.
 * Provides basic numeric validation that integrates with existing warning systems.
 */

export interface FieldRule {
  /** Form field key */
  key: string;
  /** Human-readable label */
  label: string;
  /** Minimum allowed value (default: 0 exclusive, i.e. must be > 0) */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Whether zero is acceptable (default: false — must be > 0) */
  allowZero?: boolean;
  /** Whether negative values are acceptable (default: false) */
  allowNegative?: boolean;
  /** Whether the field is optional (skip if empty) */
  optional?: boolean;
}

/**
 * Validate numeric form fields against rules.
 * Returns an array of error messages (empty = valid).
 */
export function validateNumericInputs(form: Record<string, unknown>, rules: FieldRule[]): string[] {
  const errors: string[] = [];
  for (const rule of rules) {
    const raw = form[rule.key];
    if (raw === undefined || raw === null || raw === '') {
      if (rule.optional) continue;
      errors.push(`${rule.label} is required`);
      continue;
    }
    const val = parseFloat(String(raw));
    if (isNaN(val)) {
      errors.push(`${rule.label} must be a valid number`);
      continue;
    }
    if (!rule.allowNegative && !rule.allowZero && val <= 0) {
      errors.push(`${rule.label} must be greater than 0`);
    } else if (!rule.allowNegative && val < 0) {
      errors.push(`${rule.label} must not be negative`);
    } else if (rule.min !== undefined && val < rule.min) {
      errors.push(`${rule.label} must be at least ${rule.min}`);
    } else if (rule.max !== undefined && val > rule.max) {
      errors.push(`${rule.label} must be at most ${rule.max}`);
    }
  }
  return errors;
}
