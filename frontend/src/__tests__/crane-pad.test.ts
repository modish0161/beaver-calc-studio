// =============================================================================
// Crane Pad Design Calculation Tests
// =============================================================================

import { describe, expect, it } from "vitest";

describe("Crane Pad Design", () => {
  it("calculates bearing pressure under crawler crane track", () => {
    const trackLoad = 450; // kN per track
    const trackLength = 5.0; // m
    const trackWidth = 0.8; // m
    const area = trackLength * trackWidth;
    const q = trackLoad / area; // kPa

    expect(q).toBeCloseTo(112.5, 1);
  });

  it("calculates required timber mat thickness (bending)", () => {
    const q = 112.5; // kPa bearing pressure
    const matWidth = 1.0; // m unit strip
    const trackWidth = 0.8; // m (load application width)
    const overhang = 0.5; // m cantilever beyond track

    // Bending moment in cantilever
    const w = q * matWidth; // kN/m line load
    const M = (w * overhang ** 2) / 2; // kNm

    // Required section modulus for timber
    const fb = 20; // MPa (hardwood bending)
    const Zreq = (M * 1e6) / (fb * 1e3); // cm³

    expect(M).toBeCloseTo(14.06, 0);
    expect(Zreq).toBeGreaterThan(500);
  });

  it("checks allowable ground bearing vs applied pressure", () => {
    const craneLoad = 450; // kN per track
    const matLength = 6.0;
    const matWidth = 1.2;
    const spreadAngle = 30; // degrees
    const matThickness = 0.2; // m

    // Load spread through mat at matThickness depth
    const spread = 2 * matThickness * Math.tan((spreadAngle * Math.PI) / 180);
    const effectiveLength = matLength;
    const effectiveWidth = matWidth + spread;
    const qApplied = craneLoad / (effectiveLength * effectiveWidth);

    const allowableBearing = 100; // kPa

    expect(qApplied).toBeLessThan(allowableBearing);
  });
});
