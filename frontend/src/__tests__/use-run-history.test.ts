// =============================================================================
// useRunHistory Tests — localStorage persistence + backend sync
// =============================================================================

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteRunById,
  getAllRuns,
  getRunById,
  getRunsByCalculator,
  useRunHistory,
} from "../lib/useRunHistory";

// Mock calculatorService
vi.mock("../api/calculators", () => ({
  calculatorService: {
    syncRun: vi.fn(),
  },
}));

import { calculatorService } from "../api/calculators";

const STORAGE_KEY = "beaver-run-history";

describe("useRunHistory", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("saveRun persists a snapshot to localStorage", () => {
    const { result } = renderHook(() => useRunHistory("steel_beam_bending"));
    let id: string;
    act(() => {
      id = result.current.saveRun("Test Run", { span: 6 }, { moment: 45 });
    });
    expect(id!).toBeTruthy();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].calculator).toBe("steel_beam_bending");
    expect(stored[0].inputs.span).toBe(6);
    expect(stored[0].results.moment).toBe(45);
    expect(stored[0].label).toBe("Test Run");
  });

  it("saveRun includes status and summary when provided", () => {
    const { result } = renderHook(() => useRunHistory("pad_footing"));
    act(() => {
      result.current.saveRun(
        "Footing A",
        { width: 1.5 },
        { bearing: 120 },
        {
          status: "PASS",
          summary: "Bearing OK at 120 kPa",
        },
      );
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored[0].status).toBe("PASS");
    expect(stored[0].summary).toBe("Bearing OK at 120 kPa");
  });

  it("listRuns returns only runs for the current calculator", () => {
    const { result: hook1 } = renderHook(() => useRunHistory("calc_a"));
    const { result: hook2 } = renderHook(() => useRunHistory("calc_b"));

    act(() => {
      hook1.current.saveRun("Run A1", {}, {});
      hook2.current.saveRun("Run B1", {}, {});
      hook1.current.saveRun("Run A2", {}, {});
    });

    const runsA = hook1.current.listRuns();
    const runsB = hook2.current.listRuns();
    expect(runsA).toHaveLength(2);
    expect(runsB).toHaveLength(1);
    expect(runsA.every((r) => r.calculator === "calc_a")).toBe(true);
  });

  it("deleteRun removes a specific run", () => {
    const { result } = renderHook(() => useRunHistory("test_calc"));
    let id: string;
    act(() => {
      id = result.current.saveRun("To Delete", {}, {});
      result.current.saveRun("To Keep", {}, {});
    });

    act(() => {
      result.current.deleteRun(id!);
    });

    const runs = result.current.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].label).toBe("To Keep");
  });

  it("clearRuns removes all runs for current calculator only", () => {
    const { result: hookA } = renderHook(() => useRunHistory("calc_a"));
    const { result: hookB } = renderHook(() => useRunHistory("calc_b"));

    act(() => {
      hookA.current.saveRun("A1", {}, {});
      hookA.current.saveRun("A2", {}, {});
      hookB.current.saveRun("B1", {}, {});
    });

    act(() => {
      hookA.current.clearRuns();
    });

    expect(hookA.current.listRuns()).toHaveLength(0);
    expect(hookB.current.listRuns()).toHaveLength(1);
  });

  it("trims runs to max 30 per calculator", () => {
    const { result } = renderHook(() => useRunHistory("heavy_calc"));
    act(() => {
      for (let i = 0; i < 35; i++) {
        result.current.saveRun(`Run ${i}`, { i }, { val: i });
      }
    });

    const runs = result.current.listRuns();
    expect(runs.length).toBeLessThanOrEqual(30);
  });

  it("attempts backend sync when token is present", () => {
    const mockSync = vi.mocked(calculatorService.syncRun);
    mockSync.mockResolvedValue({
      data: { run: { run_id: "backend-001" } },
    } as any);
    localStorage.setItem("beaver-token", "jwt-test-token");

    const { result } = renderHook(() => useRunHistory("synced_calc"));
    act(() => {
      result.current.saveRun(
        "Synced Run",
        { span: 8 },
        { moment: 64 },
        { status: "PASS" },
      );
    });

    expect(mockSync).toHaveBeenCalledWith(
      "synced_calc",
      { span: 8 },
      { moment: 64 },
      undefined,
      { label: "Synced Run", status: "PASS", summary: undefined },
    );
  });

  it("does NOT attempt backend sync when no token", () => {
    const mockSync = vi.mocked(calculatorService.syncRun);
    // No token set

    const { result } = renderHook(() => useRunHistory("local_only"));
    act(() => {
      result.current.saveRun("Local Run", {}, {});
    });

    expect(mockSync).not.toHaveBeenCalled();
  });

  it("does NOT attempt backend sync when token is 'offline'", () => {
    const mockSync = vi.mocked(calculatorService.syncRun);
    localStorage.setItem("beaver-token", "offline");

    const { result } = renderHook(() => useRunHistory("offline_calc"));
    act(() => {
      result.current.saveRun("Offline Run", {}, {});
    });

    expect(mockSync).not.toHaveBeenCalled();
  });
});

describe("standalone helpers", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("getAllRuns returns every saved run", () => {
    const { result: h1 } = renderHook(() => useRunHistory("a"));
    const { result: h2 } = renderHook(() => useRunHistory("b"));
    act(() => {
      h1.current.saveRun("A", {}, {});
      h2.current.saveRun("B", {}, {});
    });
    expect(getAllRuns().length).toBe(2);
  });

  it("getRunsByCalculator filters correctly", () => {
    const { result: h1 } = renderHook(() => useRunHistory("x"));
    const { result: h2 } = renderHook(() => useRunHistory("y"));
    act(() => {
      h1.current.saveRun("X1", {}, {});
      h2.current.saveRun("Y1", {}, {});
    });
    expect(getRunsByCalculator("x")).toHaveLength(1);
    expect(getRunsByCalculator("x")[0].calculator).toBe("x");
  });

  it("getRunById finds the correct run", () => {
    const { result } = renderHook(() => useRunHistory("find_test"));
    let id: string;
    act(() => {
      id = result.current.saveRun("Find Me", { key: 1 }, { val: 2 });
    });
    const found = getRunById(id!);
    expect(found).toBeDefined();
    expect(found!.label).toBe("Find Me");
  });

  it("deleteRunById removes the target run", () => {
    const { result } = renderHook(() => useRunHistory("del_test"));
    let id: string;
    act(() => {
      id = result.current.saveRun("Bye", {}, {});
      result.current.saveRun("Stay", {}, {});
    });
    deleteRunById(id!);
    expect(getAllRuns()).toHaveLength(1);
    expect(getAllRuns()[0].label).toBe("Stay");
  });
});
