// =============================================================================
// Gravity Wall Stability Tests — EN 1997-1
// =============================================================================

import { describe, expect, it } from "vitest";

describe("Gravity Retaining Wall — EN 1997-1", () => {
  // Wall geometry
  const H = 3.0; // m wall height
  const B = 3.0; // m base width
  const t_top = 0.4; // m wall top width
  const t_base = 0.6; // m base thickness
  const gamma_c = 24; // kN/m³ concrete

  // Soil properties
  const phi = 30; // degrees
  const gamma_s = 18; // kN/m³ soil
  const delta = 20; // degrees wall friction

  it("calculates active earth pressure coefficient Ka (Rankine)", () => {
    const phiRad = (phi * Math.PI) / 180;
    const Ka = Math.tan(Math.PI / 4 - phiRad / 2) ** 2;
    expect(Ka).toBeCloseTo(0.333, 2);
  });

  it("calculates horizontal active thrust", () => {
    const phiRad = (phi * Math.PI) / 180;
    const Ka = Math.tan(Math.PI / 4 - phiRad / 2) ** 2;
    const Pa = 0.5 * Ka * gamma_s * H ** 2; // kN/m
    expect(Pa).toBeCloseTo(27.0, 0);
  });

  it("checks sliding stability (FoS > 1.5)", () => {
    const phiRad = (phi * Math.PI) / 180;
    const Ka = Math.tan(Math.PI / 4 - phiRad / 2) ** 2;
    const Pa = 0.5 * Ka * gamma_s * H ** 2;

    // Self-weight of wall (simplified trapezoidal)
    const W = gamma_c * H * ((t_top + B) / 2); // kN/m
    const mu = Math.tan((2 / 3) * phiRad); // base friction coefficient

    const FoS_sliding = (W * mu) / Pa;
    expect(FoS_sliding).toBeGreaterThan(1.5);
  });

  it("checks overturning stability (FoS > 2.0)", () => {
    const phiRad = (phi * Math.PI) / 180;
    const Ka = Math.tan(Math.PI / 4 - phiRad / 2) ** 2;
    const Pa = 0.5 * Ka * gamma_s * H ** 2;
    const lever_Pa = H / 3; // acts at H/3 from base

    // Restoring moment from self-weight about toe
    const W = gamma_c * H * ((t_top + B) / 2);
    const x_cg = B * 0.55; // approximate centroid from toe

    const M_restoring = W * x_cg;
    const M_overturning = Pa * lever_Pa;

    const FoS_overturning = M_restoring / M_overturning;
    expect(FoS_overturning).toBeGreaterThan(2.0);
  });
});
