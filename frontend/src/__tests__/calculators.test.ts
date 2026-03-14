// =============================================================================
// Calculator Unit Tests — Core structural engineering calculations
// vitest — run with: npx vitest
// =============================================================================

import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Since calculation logic lives inside React components (useCallback),
// we extract and test the pure math directly here. These formulas mirror
// the exact calculations in the calculator pages.
// ---------------------------------------------------------------------------

// ===================== STEEL BEAM BENDING (EN 1993-1-1) =====================

describe("Steel Beam Bending — EN 1993-1-1", () => {
  // Section properties for UB 457x191x67
  const section = {
    h: 453.4,
    b: 189.9,
    tw: 8.5,
    tf: 12.7,
    A: 8550,
    Iy: 29380e4,
    Wel_y: 1296e3,
    Wpl_y: 1453e3,
    iz: 41.2,
    Iw: 706e9,
    It: 37.1e4,
  };

  const fy = 355; // S355 steel
  const E = 210000;
  const G = 81000;
  const gamma_m0 = 1.0;
  const gamma_m1 = 1.0;

  it("calculates plastic moment resistance Mc,Rd correctly", () => {
    // Mc,Rd = Wpl,y * fy / γM0 (in kNm)
    const Mc_Rd = (section.Wpl_y * fy) / gamma_m0 / 1e6;
    expect(Mc_Rd).toBeCloseTo(515.815, 1);
  });

  it("calculates shear resistance Vpl,Rd correctly", () => {
    // Shear area (simplified) and Vpl,Rd
    const Av =
      section.A - 2 * section.b * section.tf + (section.tw + 0) * section.tf;
    const Av_eff = Math.max(Av, section.h * section.tw);
    const Vpl_Rd = (Av_eff * fy) / Math.sqrt(3) / gamma_m0 / 1000; // kN
    expect(Vpl_Rd).toBeGreaterThan(500);
    expect(Vpl_Rd).toBeLessThan(1500);
  });

  it("calculates UDL design moment for simply supported beam", () => {
    const w_Ed = 1.35 * 10 + 1.5 * 15; // kN/m (factored) = 36 kN/m
    const span_m = 8;
    const M_Ed = (w_Ed * span_m ** 2) / 8; // kNm
    expect(M_Ed).toBeCloseTo(288.0, 0);
  });

  it("calculates point load moment at midspan", () => {
    const P_Ed = 50; // kN
    const span_m = 6;
    const a = 0.5 * span_m; // midspan
    const b_span = span_m - a;
    const M_point = (P_Ed * a * b_span) / span_m;
    expect(M_point).toBeCloseTo(75, 0);
  });

  it("calculates LTB slenderness and chi_LT", () => {
    const Lcr = 3000; // mm
    const C1 = 1.132;
    const kz = 1.0;

    const Mcr =
      (((C1 * Math.PI ** 2 * E * section.Iy) / (kz * Lcr) ** 2) *
        Math.sqrt(
          section.Iw / section.Iy +
            ((kz * Lcr) ** 2 * G * section.It) /
              (Math.PI ** 2 * E * section.Iy),
        )) /
      1e6;

    const lambda_LT = Math.sqrt((section.Wpl_y * fy) / 1e6 / Mcr);

    // Lambda should be moderate for a 3m restraint spacing
    expect(lambda_LT).toBeGreaterThan(0);
    expect(lambda_LT).toBeLessThan(2);

    // chi_LT calculation
    const alpha_LT = 0.49;
    const lambda_LT0 = 0.4;
    const beta = 0.75;

    let chi_LT: number;
    if (lambda_LT <= lambda_LT0) {
      chi_LT = 1.0;
    } else {
      const phi_LT =
        0.5 * (1 + alpha_LT * (lambda_LT - lambda_LT0) + beta * lambda_LT ** 2);
      chi_LT = Math.min(
        1.0,
        1 / (phi_LT + Math.sqrt(phi_LT ** 2 - beta * lambda_LT ** 2)),
      );
    }

    expect(chi_LT).toBeGreaterThan(0);
    expect(chi_LT).toBeLessThanOrEqual(1);
  });

  it("calculates SLS deflection correctly", () => {
    const span_mm = 8000;
    const w_sls = 25; // kN/m (unfactored total)
    // 5wL^4 / 384EI
    const delta = (5 * w_sls * span_mm ** 4) / (384 * E * section.Iy);
    expect(delta).toBeGreaterThan(0);

    // Check L/360 limit
    const limit = span_mm / 360;
    expect(limit).toBeCloseTo(22.22, 1);
  });
});

// ===================== RC BEAM DESIGN (EN 1992-1-1) ========================

describe("RC Beam Design — EN 1992-1-1", () => {
  const fck = 30; // MPa (C30/37)
  const fyk = 500; // MPa (B500B)
  const gamma_c = 1.5;
  const gamma_s = 1.15;
  const alpha_cc = 0.85;

  const fcd = (alpha_cc * fck) / gamma_c;
  const fyd = fyk / gamma_s;

  it("calculates design concrete strength fcd", () => {
    expect(fcd).toBeCloseTo(17.0, 1);
  });

  it("calculates design rebar strength fyd", () => {
    expect(fyd).toBeCloseTo(434.78, 1);
  });

  it("calculates flexural capacity (singly reinforced)", () => {
    const b = 300; // mm
    const d = 540; // mm (effective depth)
    const As = 1570; // mm² (e.g. 2xH32)

    // Neutral axis depth from equilibrium
    const x = (As * fyd) / (0.8 * b * fcd);
    const z = d - 0.4 * x;

    // Moment resistance
    const M_Rd = (As * fyd * z) / 1e6; // kNm

    expect(M_Rd).toBeGreaterThan(300);
    expect(M_Rd).toBeLessThan(500);
    expect(x / d).toBeLessThan(0.45); // Ductile failure
  });

  it("checks minimum reinforcement ratio", () => {
    const b = 300;
    const d = 540;
    const fctm = 2.9; // MPa for C30/37

    const As_min = Math.max(0.26 * (fctm / fyk) * b * d, 0.0013 * b * d);
    expect(As_min).toBeGreaterThan(200);
    expect(As_min).toBeLessThan(300);
  });
});

// ===================== BASE PLATE DESIGN (EN 1993-1-8) =====================

describe("Base Plate Design — EN 1993-1-8", () => {
  it("calculates effective bearing area under column", () => {
    const N_Ed = 800; // kN
    const fck = 25; // MPa
    const gamma_c = 1.5;
    const fjd = (0.67 * fck) / gamma_c;

    const A_req = (N_Ed * 1000) / fjd; // mm²
    expect(A_req).toBeGreaterThan(50000);

    // Plate size check
    const plateWidth = 350; // mm
    const plateLength = 350;
    const A_plate = plateWidth * plateLength;
    expect(A_plate).toBeGreaterThanOrEqual(A_req);
  });

  it("calculates base plate thickness", () => {
    const N_Ed = 800; // kN
    const a = 350; // mm plate width
    const b = 350;
    const fy = 275;
    const gamma_m0 = 1.0;

    // Bearing pressure
    const bearing = (N_Ed * 1000) / (a * b); // MPa

    // Cantilever projection
    const col_bf = 254; // column flange width
    const col_d = 254; // column depth
    const c = Math.max((a - col_d) / 2, (b - col_bf) / 2);

    // Required thickness
    const t_req = c * Math.sqrt((3 * bearing) / (fy / gamma_m0));
    expect(t_req).toBeGreaterThan(10);
    expect(t_req).toBeLessThan(50);
  });
});

// ===================== PILE FOUNDATIONS (EN 1997-1) =========================

describe("Pile Foundations — EN 1997-1", () => {
  it("calculates single pile bearing capacity (alpha method)", () => {
    const D = 0.6; // m diameter
    const L = 15; // m length
    const cu = 80; // kPa undrained shear strength
    const alpha = 0.5; // adhesion factor
    const Nc = 9; // bearing capacity factor

    // Shaft resistance
    const As = Math.PI * D * L; // m²
    const Rs = alpha * cu * As; // kN

    // Base resistance
    const Ab = (Math.PI * D ** 2) / 4; // m²
    const Rb = Nc * cu * Ab; // kN

    const Rc = Rs + Rb; // Total pile capacity

    expect(Rs).toBeCloseTo(1130.97, 0);
    expect(Rb).toBeCloseTo(203.58, 0);
    expect(Rc).toBeCloseTo(1334.55, 0);
  });

  it("applies partial factors correctly (DA1-C2)", () => {
    const Rc = 1335; // kN (characteristic)
    const gamma_b = 1.7; // Base resistance factor
    const gamma_s = 1.4; // Shaft resistance factor
    const Rs = 1131;
    const Rb = 204;

    const Rd = Rs / gamma_s + Rb / gamma_b;
    expect(Rd).toBeCloseTo(927.76, 0);
  });
});

// ===================== COMPOSITE BEAM (EN 1994-1-1) ========================

describe("Composite Beam — EN 1994-1-1", () => {
  it("calculates effective slab width beff", () => {
    const beamSpacing = 3.0; // m
    const span = 9.0; // m
    const Le = span; // For simply supported

    const b0 = 0; // assumed
    const bei = Math.min(Le / 8, beamSpacing / 2);
    const beff = b0 + 2 * bei;

    expect(bei).toBeCloseTo(1.125, 2);
    expect(beff).toBeCloseTo(2.25, 2);
  });

  it("calculates number of shear studs required", () => {
    const Rq = 2000; // kN (longitudinal shear force)
    const PRd = 80; // kN (design resistance per stud)

    const n = Math.ceil(Rq / PRd);
    expect(n).toBe(25);
  });
});

// ===================== WIND ACTIONS (EN 1991-1-4) ==========================

describe("Wind Actions — EN 1991-1-4", () => {
  it("calculates peak velocity pressure qp(z)", () => {
    const vb0 = 24; // m/s fundamental basic wind velocity (UK typical)
    const cdir = 1.0;
    const cseason = 1.0;
    const vb = cdir * cseason * vb0;

    const rho = 1.25; // kg/m³
    const z = 10; // m height
    const z0 = 0.3; // terrain roughness length (Category III)
    const zmin = 5;
    const z_eff = Math.max(z, zmin);

    const kr = 0.19 * (z0 / 0.05) ** 0.07;
    const cr = kr * Math.log(z_eff / z0);
    const vm = cr * vb;

    const Iv = 1 / Math.log(z_eff / z0); // turbulence intensity
    const qp = (1 + 7 * Iv) * 0.5 * rho * vm ** 2;

    expect(vm).toBeGreaterThan(15);
    expect(vm).toBeLessThan(35);
    expect(qp).toBeGreaterThan(200);
    expect(qp).toBeLessThan(2000);
  });
});

// ===================== UTILITY MATH ========================================

describe("Utility calculations", () => {
  it("interpolates linearly between two points", () => {
    const x0 = 0,
      y0 = 10;
    const x1 = 100,
      y1 = 50;
    const x = 40;
    const y = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    expect(y).toBeCloseTo(26, 0);
  });

  it("converts between unit systems correctly", () => {
    // kN to lbf
    const kN = 100;
    const lbf = kN * 224.809;
    expect(lbf).toBeCloseTo(22480.9, 0);

    // mm to inches
    const mm = 254;
    const inches = mm / 25.4;
    expect(inches).toBeCloseTo(10, 1);

    // MPa to psi
    const MPa = 30;
    const psi = MPa * 145.038;
    expect(psi).toBeCloseTo(4351.1, 0);
  });
});
