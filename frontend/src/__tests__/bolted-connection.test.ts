// =============================================================================
// Bolted Connection Calculation Tests — EN 1993-1-8
// =============================================================================

import { describe, expect, it } from "vitest";

describe("Bolted Connection — EN 1993-1-8", () => {
  const fub = 800; // MPa (Grade 8.8)
  const fy = 275; // MPa (plate S275)
  const fu = 410; // MPa (plate S275)
  const gamma_m2 = 1.25;
  const d = 20; // mm bolt diameter
  const d0 = 22; // mm hole diameter
  const As = 245; // mm² tensile stress area (M20)

  it("calculates bolt shear resistance Fv,Rd per shear plane", () => {
    const alpha_v = 0.6; // for 8.8
    const Fv_Rd = (alpha_v * fub * As) / gamma_m2 / 1000; // kN
    expect(Fv_Rd).toBeCloseTo(94.08, 1);
  });

  it("calculates bolt bearing resistance Fb,Rd", () => {
    const t = 10; // mm plate thickness
    const e1 = 40; // mm end distance
    const p1 = 60; // mm pitch

    const alpha_d = Math.min(
      e1 / (3 * d0),
      p1 / (3 * d0) - 0.25,
      fub / fu,
      1.0,
    );
    const k1 = Math.min(2.8 * (40 / d0) - 1.7, 2.5); // edge row
    const Fb_Rd = (k1 * alpha_d * fu * d * t) / gamma_m2 / 1000;

    expect(alpha_d).toBeLessThanOrEqual(1.0);
    expect(Fb_Rd).toBeGreaterThan(50);
  });

  it("calculates bolt tension resistance Ft,Rd", () => {
    const k2 = 0.9;
    const Ft_Rd = (k2 * fub * As) / gamma_m2 / 1000;
    expect(Ft_Rd).toBeCloseTo(141.12, 1);
  });

  it("checks combined shear and tension interaction", () => {
    const Fv_Ed = 50; // kN applied shear
    const Ft_Ed = 60; // kN applied tension

    const Fv_Rd = (0.6 * fub * As) / gamma_m2 / 1000;
    const Ft_Rd = (0.9 * fub * As) / gamma_m2 / 1000;

    // EN 1993-1-8 Table 3.4 interaction
    const ratio = Fv_Ed / Fv_Rd + Ft_Ed / (1.4 * Ft_Rd);
    expect(ratio).toBeLessThanOrEqual(1.0);
  });

  it("calculates net section tension resistance", () => {
    const t = 10; // mm plate thickness
    const width = 200; // mm plate width
    const nBolts = 2; // bolts across width
    const Anet = (width - nBolts * d0) * t;
    const Nu_Rd = (0.9 * Anet * fu) / gamma_m2 / 1000;

    expect(Anet).toBe(1560);
    expect(Nu_Rd).toBeCloseTo(460.51, 0);
  });
});
