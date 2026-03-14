// =============================================================================
// Deflection & Serviceability Tests — General Structural
// =============================================================================

import { describe, expect, it } from "vitest";

const E_steel = 210000; // MPa
const E_concrete = 33000; // MPa
const E_timber = 8000; // MPa

describe("Deflection & Serviceability", () => {
  describe("Simply Supported Beam Deflections", () => {
    it("UDL deflection formula: 5wL⁴/384EI", () => {
      const w = 10; // N/mm (= 10 kN/m)
      const L = 6000; // mm
      const I = 10000e4; // mm⁴ (typical UB)
      const delta = (5 * w * L ** 4) / (384 * E_steel * I);
      expect(delta).toBeCloseTo(8.04, 1);
    });

    it("point load deflection formula: PL³/48EI", () => {
      const P = 50000; // N (50 kN)
      const L = 8000; // mm
      const I = 20000e4; // mm⁴
      const delta = (P * L ** 3) / (48 * E_steel * I);
      expect(delta).toBeCloseTo(12.7, 1);
    });

    it("checks L/360 limit for floor beams", () => {
      const L = 8000;
      const limit = L / 360;
      const actualDeflection = 18;
      expect(actualDeflection).toBeLessThan(limit);
    });

    it("checks L/200 limit for roof beams", () => {
      const L = 10000;
      const limit = L / 200;
      expect(limit).toBeCloseTo(50, 0);
    });
  });

  describe("Cantilever Deflections", () => {
    it("UDL cantilever: wL⁴/8EI", () => {
      const w = 5; // kN/m
      const L = 3000;
      const I = 5000e4;
      const delta = (w * L ** 4) / (8 * E_steel * I);
      expect(delta).toBeCloseTo(4.82, 1);
    });

    it("point load cantilever: PL³/3EI", () => {
      const P = 20000; // N
      const L = 2000;
      const I = 3000e4;
      const delta = (P * L ** 3) / (3 * E_steel * I);
      expect(delta).toBeCloseTo(8.47, 1);
    });
  });
});

describe("Section Property Calculations", () => {
  it("calculates second moment of area for rectangle", () => {
    const b = 300; // mm
    const h = 500;
    const I = (b * h ** 3) / 12;
    expect(I).toBeCloseTo(3125e6, -6);
  });

  it("calculates plastic section modulus for rectangle", () => {
    const b = 300;
    const h = 500;
    const Wpl = (b * h ** 2) / 4;
    expect(Wpl).toBe(18750000);
  });

  it("calculates composite section transformed properties", () => {
    // Concrete slab on steel beam (modular ratio method)
    const n = E_steel / E_concrete; // modular ratio
    const beff = 2000; // mm slab effective width
    const ts = 150; // mm slab thickness
    const As_beam = 8550; // mm² steel area (UB 457x191x67)
    const Is_beam = 29380e4; // mm⁴
    const d_beam = 453.4; // mm beam depth

    // Transformed slab area
    const Ac_tr = (beff * ts) / n;
    const y_slab = d_beam + ts / 2; // slab centroid from beam bottom
    const y_beam = d_beam / 2;

    const A_total = As_beam + Ac_tr;
    const y_na = (As_beam * y_beam + Ac_tr * y_slab) / A_total;

    expect(n).toBeCloseTo(6.36, 1);
    expect(y_na).toBeGreaterThan(d_beam / 2);
    expect(y_na).toBeLessThan(d_beam + ts);
  });
});
