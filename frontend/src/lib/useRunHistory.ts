import { useCallback } from "react";
import { calculatorService } from "../api/calculators";

// ============================================================================
// Run History — localStorage-backed calculation run storage
// Each calculator can save snapshots of its inputs + results for comparison.
// When the user is authenticated, runs are also synced to the backend for
// audit trail and cross-device access.
// ============================================================================

export interface RunSnapshot {
  id: string;
  /** Calculator slug, e.g. "steel_beam_bending" */
  calculator: string;
  /** User-provided label, e.g. "Option A – UB 457" */
  label: string;
  /** ISO timestamp */
  savedAt: string;
  /** Raw form inputs */
  inputs: Record<string, string | number>;
  /** Computed results — shape varies per calculator */
  results: Record<string, any>;
  /** Overall status (PASS / FAIL / INFO) */
  status?: string;
  /** Key metric for quick comparison (e.g. "78.3 % utilisation") */
  summary?: string;
  /** Backend run_id when successfully synced */
  backendRunId?: string;
}

const STORAGE_KEY = "beaver-run-history";
const MAX_RUNS_PER_CALC = 30;

/* ── Raw storage helpers ────────────────────────────────────────────────── */

function getAll(): RunSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(runs: RunSnapshot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

/* ── Hook ────────────────────────────────────────────────────────────────── */

export function useRunHistory(calculatorKey: string) {
  /** Save a new run snapshot. Returns its id. */
  const saveRun = useCallback(
    (
      label: string,
      inputs: Record<string, string | number>,
      results: Record<string, any>,
      opts?: { status?: string; summary?: string },
    ): string => {
      const all = getAll();
      const run: RunSnapshot = {
        id: `${calculatorKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        calculator: calculatorKey,
        label,
        savedAt: new Date().toISOString(),
        inputs,
        results,
        status: opts?.status,
        summary: opts?.summary,
      };
      all.unshift(run);
      // Trim per-calculator list
      const mine = all
        .filter((r) => r.calculator === calculatorKey)
        .slice(0, MAX_RUNS_PER_CALC);
      const others = all.filter((r) => r.calculator !== calculatorKey);
      persist([...mine, ...others]);

      // Background sync to backend (fire-and-forget)
      const token = localStorage.getItem("beaver-token");
      if (token && token !== "offline") {
        calculatorService
          .syncRun(calculatorKey, inputs, results, undefined, {
            label,
            status: opts?.status,
            summary: opts?.summary,
          })
          .then(({ data }) => {
            // Store backend run_id on the local snapshot
            const updated = getAll();
            const idx = updated.findIndex((r) => r.id === run.id);
            if (idx !== -1) {
              updated[idx].backendRunId = data.run.run_id;
              persist(updated);
            }
          })
          .catch(() => {
            // Sync failed silently — local copy is still saved
          });
      }

      return run.id;
    },
    [calculatorKey],
  );

  /** List all runs for this calculator, newest first. */
  const listRuns = useCallback((): RunSnapshot[] => {
    return getAll().filter((r) => r.calculator === calculatorKey);
  }, [calculatorKey]);

  /** Delete a single run by id. */
  const deleteRun = useCallback((id: string) => {
    persist(getAll().filter((r) => r.id !== id));
  }, []);

  /** Delete all runs for this calculator. */
  const clearRuns = useCallback(() => {
    persist(getAll().filter((r) => r.calculator !== calculatorKey));
  }, [calculatorKey]);

  return { saveRun, listRuns, deleteRun, clearRuns };
}

/* ── Standalone helpers (used by Compare page without a fixed calculator) ── */

export function getAllRuns(): RunSnapshot[] {
  return getAll();
}

export function getRunsByCalculator(key: string): RunSnapshot[] {
  return getAll().filter((r) => r.calculator === key);
}

export function getRunById(id: string): RunSnapshot | undefined {
  return getAll().find((r) => r.id === id);
}

export function deleteRunById(id: string) {
  persist(getAll().filter((r) => r.id !== id));
}
