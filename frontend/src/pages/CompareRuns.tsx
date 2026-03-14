import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    FiBarChart2,
    FiChevronDown,
    FiFilter,
    FiTrash2,
    FiX,
} from 'react-icons/fi';
import { calculatorRegistry } from '../data/calculatorRegistry';
import {
    deleteRunById,
    getAllRuns,
    type RunSnapshot,
} from '../lib/useRunHistory';

// ============================================================================
// Compare Runs — side-by-side comparison of saved calculator runs
// ============================================================================

const CompareRuns: React.FC = () => {
  const [runs, setRuns] = useState<RunSnapshot[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterCalc, setFilterCalc] = useState<string>('');

  const refresh = useCallback(() => setRuns(getAllRuns()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Unique calculator keys present in runs
  const calcKeys = useMemo(
    () => [...new Set(runs.map((r) => r.calculator))].sort(),
    [runs],
  );

  // Filtered list
  const filteredRuns = useMemo(
    () => (filterCalc ? runs.filter((r) => r.calculator === filterCalc) : runs),
    [runs, filterCalc],
  );

  // Currently selected runs (max 4)
  const selected = useMemo(
    () => selectedIds.map((id) => runs.find((r) => r.id === id)).filter(Boolean) as RunSnapshot[],
    [selectedIds, runs],
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4
          ? [...prev, id]
          : prev,
    );
  };

  const remove = (id: string) => {
    deleteRunById(id);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    refresh();
  };

  // Build unified key list across all selected runs
  const allInputKeys = useMemo(() => {
    const keys = new Set<string>();
    selected.forEach((r) => Object.keys(r.inputs).forEach((k) => keys.add(k)));
    return [...keys].sort();
  }, [selected]);

  const allResultKeys = useMemo(() => {
    const keys = new Set<string>();
    selected.forEach((r) => Object.keys(r.results).forEach((k) => keys.add(k)));
    return [...keys].sort();
  }, [selected]);

  const calcLabel = (key: string) => {
    const entry = calculatorRegistry[key];
    return entry?.name ?? key.replace(/_/g, ' ');
  };

  const fmtVal = (v: unknown): string => {
    if (v === undefined || v === null) return '—';
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto max-w-7xl px-4 py-28">
      <header className="mb-8 flex items-center gap-3">
        <FiBarChart2 className="h-7 w-7 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Compare Runs</h1>
      </header>

      {/* ── Filter + Run List ─────────────────────────────────────────── */}
      <section className="mb-10 rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <FiFilter className="text-slate-400" />
          <span className="text-sm text-slate-400">Filter by calculator:</span>
          <div className="relative">
            <select
              value={filterCalc}
              onChange={(e) => setFilterCalc(e.target.value)}
              aria-label="Filter by calculator"
              className="appearance-none rounded border border-slate-600 bg-slate-800 py-1 pl-3 pr-8 text-sm text-slate-200"
            >
              <option value="">All calculators</option>
              {calcKeys.map((k) => (
                <option key={k} value={k}>
                  {calcLabel(k)}
                </option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          </div>
          <span className="ml-auto text-xs text-slate-500">
            {filteredRuns.length} run{filteredRuns.length !== 1 && 's'} • select up to 4
          </span>
        </div>

        {filteredRuns.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No saved runs yet. Use the <strong>Save Run</strong> button inside any
            calculator to store a snapshot.
          </p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {filteredRuns.map((run) => {
              const isSelected = selectedIds.includes(run.id);
              return (
                <div
                  key={run.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'border border-blue-500/40 bg-blue-900/30 text-white'
                      : 'border border-transparent hover:bg-slate-800/60 text-slate-300'
                  }`}
                  onClick={() => toggle(run.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    aria-label={`Select ${run.label}`}
                    className="accent-blue-500"
                  />
                  <span className="font-medium">{run.label}</span>
                  <span className="text-xs text-slate-500">{calcLabel(run.calculator)}</span>
                  {run.status && (
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        run.status === 'PASS'
                          ? 'bg-emerald-900/40 text-emerald-400'
                          : run.status === 'FAIL'
                            ? 'bg-red-900/40 text-red-400'
                            : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {run.status}
                    </span>
                  )}
                  {run.summary && (
                    <span className="text-xs text-slate-500">{run.summary}</span>
                  )}
                  <span className="ml-auto text-[10px] text-slate-600">
                    {new Date(run.savedAt).toLocaleString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(run.id);
                    }}
                    className="rounded p-1 text-slate-600 hover:bg-red-900/30 hover:text-red-400"
                    title="Delete run"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Comparison Table ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selected.length >= 2 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 backdrop-blur"
          >
            {/* Column Headers */}
            <div className="mb-6 flex items-start gap-3">
              <h2 className="text-lg font-semibold text-white">Side-by-side</h2>
              <button
                onClick={() => setSelectedIds([])}
                className="ml-auto rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
              >
                <FiX className="inline mr-1" size={12} />
                Clear
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="sticky left-0 z-10 bg-slate-900/90 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Parameter
                    </th>
                    {selected.map((r) => (
                      <th
                        key={r.id}
                        className="min-w-[160px] px-3 py-2 text-left text-xs font-semibold text-blue-400"
                      >
                        {r.label}
                        <div className="text-[10px] font-normal text-slate-500">
                          {calcLabel(r.calculator)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Inputs Section */}
                  <tr>
                    <td
                      colSpan={selected.length + 1}
                      className="bg-slate-800/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                    >
                      Inputs
                    </td>
                  </tr>
                  {allInputKeys.map((key) => (
                    <tr key={`i-${key}`} className="border-b border-slate-800/40">
                      <td className="sticky left-0 z-10 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400">
                        {key.replace(/_/g, ' ')}
                      </td>
                      {selected.map((r) => (
                        <td key={r.id} className="px-3 py-1.5 text-xs text-slate-200">
                          {fmtVal(r.inputs[key])}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Results Section */}
                  <tr>
                    <td
                      colSpan={selected.length + 1}
                      className="bg-slate-800/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                    >
                      Results
                    </td>
                  </tr>
                  {allResultKeys.map((key) => {
                    const vals = selected.map((r) => r.results[key]);
                    const allNumeric = vals.every((v) => typeof v === 'number');
                    const maxVal = allNumeric ? Math.max(...(vals as number[])) : null;
                    const minVal = allNumeric ? Math.min(...(vals as number[])) : null;

                    return (
                      <tr key={`r-${key}`} className="border-b border-slate-800/40">
                        <td className="sticky left-0 z-10 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400">
                          {key.replace(/_/g, ' ')}
                        </td>
                        {selected.map((r) => {
                          const v = r.results[key];
                          const isMax = allNumeric && v === maxVal && maxVal !== minVal;
                          const isMin = allNumeric && v === minVal && maxVal !== minVal;
                          return (
                            <td
                              key={r.id}
                              className={`px-3 py-1.5 text-xs ${
                                isMax
                                  ? 'font-semibold text-amber-400'
                                  : isMin
                                    ? 'font-semibold text-emerald-400'
                                    : 'text-slate-200'
                              }`}
                            >
                              {fmtVal(v)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Lowest
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Highest
              </span>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {selected.length === 1 && (
        <p className="text-center text-sm text-slate-500">
          Select at least one more run to compare.
        </p>
      )}
    </div>
  );
};

export default CompareRuns;
