// =============================================================================
// Spread Footing (EN 1997-1) Calculation Tests
// =============================================================================

import { describe, expect, it } from "vitest";

describe("Spread Footing — EN 1997-1", () => {
  it("calculates bearing pressure under concentric load", () => {
    const N = 600; // kN vertical load
    const B = 1.5; // m
    const L = 1.5; // m
    const q = (N / (B * L)) * 1; // kPa
    expect(q).toBeCloseTo(266.67, 0);
  });

  it("calculates effective area with eccentricity", () => {
    const B = 2.0;
    const L = 2.0;
    const M = 80; // kNm
    const N = 500; // kN
    const eB = M / N; // m eccentricity
    const Beff = B - 2 * eB;
    const Aeff = Beff * L;
    const q = N / Aeff;

    expect(eB).toBeCloseTo(0.16, 2);
    expect(Beff).toBeCloseTo(1.68, 2);
    expect(q).toBeCloseTo(148.81, 0);
  });

  it("checks overturning stability (eB < B/6)", () => {
    const B = 2.0;
    const M = 150;
    const N = 800;
    const eB = M / N;

    expect(eB).toBeLessThan(B / 6); // No tension under footing
  });

  it("calculates Terzaghi bearing capacity (strip footing)", () => {
    const c = 20; // kPa cohesion
    const phi = 30; // degrees
    const gamma = 18; // kN/m³
    const B = 1.5; // m
    const Df = 1.0; // m depth

    // Bearing capacity factors (simplified)
    const phiRad = (phi * Math.PI) / 180;
    const Nq =
      Math.exp(Math.PI * Math.tan(phiRad)) *
      Math.tan(Math.PI / 4 + phiRad / 2) ** 2;
    const Nc = (Nq - 1) / Math.tan(phiRad);
    const Ngamma = 2 * (Nq + 1) * Math.tan(phiRad);

    const q0 = gamma * Df;
    const qu = c * Nc + q0 * Nq + 0.5 * gamma * B * Ngamma;

    expect(Nq).toBeCloseTo(18.4, 0);
    expect(Nc).toBeCloseTo(30.14, 0);
    expect(qu).toBeGreaterThan(500);
  });
});
