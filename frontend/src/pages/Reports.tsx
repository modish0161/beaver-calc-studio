import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import {
  FiCopy,
  FiDownload,
  FiFile,
  FiFileText,
  FiGrid,
  FiLayers,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';

// ─── Types & Tabs ───────────────────────────────────────────────────────
type TabKey = 'pdf' | 'docx' | 'batch' | 'method-statements' | 'notes' | 'dxf' | 'ifc';

const TAB_GROUPS = [
  {
    label: 'Report Builder',
    icon: <FiFileText size={14} />,
    tabs: [
      { key: 'pdf' as TabKey, label: 'PDF Reports' },
      { key: 'docx' as TabKey, label: 'DOCX Reports' },
      { key: 'batch' as TabKey, label: 'Batch Reports' },
    ],
  },
  {
    label: 'Templates',
    icon: <FiCopy size={14} />,
    tabs: [
      { key: 'method-statements' as TabKey, label: 'Method Statements' },
      { key: 'notes' as TabKey, label: 'General Notes' },
    ],
  },
  {
    label: 'CAD Exports',
    icon: <FiGrid size={14} />,
    tabs: [
      { key: 'dxf' as TabKey, label: 'DXF Export' },
      { key: 'ifc' as TabKey, label: 'IFC Export' },
    ],
  },
];

const pathMap: Record<string, TabKey> = {
  '/reports': 'pdf',
  '/reports/pdf': 'pdf',
  '/reports/docx': 'docx',
  '/reports/batch': 'batch',
  '/reports/method-statements': 'method-statements',
  '/reports/notes': 'notes',
  '/reports/dxf': 'dxf',
  '/reports/ifc': 'ifc',
};
const tabPath: Record<TabKey, string> = {
  pdf: '/reports/pdf',
  docx: '/reports/docx',
  batch: '/reports/batch',
  'method-statements': '/reports/method-statements',
  notes: '/reports/notes',
  dxf: '/reports/dxf',
  ifc: '/reports/ifc',
};

// ── Mock Data (Batch, Method Statements, Notes, IFC — no backend yet) ──
const batchJobs = [
  {
    id: 'BAT-001',
    name: 'M25 — All Girder Checks',
    calcs: 12,
    status: 'completed',
    progress: 100,
    started: '2025-11-11 14:00',
    duration: '3m 42s',
  },
  {
    id: 'BAT-002',
    name: 'A14 — TW Package Complete',
    calcs: 8,
    status: 'running',
    progress: 62,
    started: '2025-11-12 09:30',
    duration: '—',
  },
  {
    id: 'BAT-003',
    name: 'A3 Footbridge — Full Assessment',
    calcs: 15,
    status: 'queued',
    progress: 0,
    started: '—',
    duration: '—',
  },
];
const methodStatements = [
  {
    id: 'MS-001',
    title: 'Crane Lifting Operations',
    category: 'Lifting',
    pages: 8,
    standard: 'BS 7121',
    uses: 34,
  },
  {
    id: 'MS-002',
    title: 'Excavation & Shoring',
    category: 'Earthworks',
    pages: 12,
    standard: 'BS 6031',
    uses: 22,
  },
  {
    id: 'MS-003',
    title: 'Falsework Erection',
    category: 'Temporary Works',
    pages: 10,
    standard: 'BS 5975',
    uses: 18,
  },
  {
    id: 'MS-004',
    title: 'Steel Erection Sequence',
    category: 'Steelwork',
    pages: 14,
    standard: 'BS 5975',
    uses: 27,
  },
  {
    id: 'MS-005',
    title: 'Concrete Pouring — Deck Slab',
    category: 'Concrete',
    pages: 6,
    standard: 'BS 8500',
    uses: 15,
  },
];
const notesPacks = [
  {
    id: 'NP-001',
    title: 'Structural Steel — General Notes',
    sheets: 2,
    standard: 'EN 1993',
    uses: 56,
  },
  {
    id: 'NP-002',
    title: 'Reinforced Concrete — General Notes',
    sheets: 2,
    standard: 'EN 1992',
    uses: 48,
  },
  {
    id: 'NP-003',
    title: 'Temporary Works — General Notes',
    sheets: 1,
    standard: 'BS 5975',
    uses: 31,
  },
  {
    id: 'NP-004',
    title: 'Pile Foundation — General Notes',
    sheets: 1,
    standard: 'EN 1997',
    uses: 19,
  },
  {
    id: 'NP-005',
    title: 'Bridge Assessment — General Notes',
    sheets: 2,
    standard: 'CS 454',
    uses: 24,
  },
];
const ifcModels = [
  {
    id: 'IFC-001',
    title: 'A3 Footbridge — Structural Model',
    elements: 342,
    format: 'IFC4',
    size: '15.6 MB',
    status: 'Ready',
  },
  {
    id: 'IFC-002',
    title: 'M25 Widening — Girder Assembly',
    elements: 128,
    format: 'IFC4',
    size: '8.2 MB',
    status: 'Beta',
  },
];

const getStatusStyle = (s: string) => {
  switch (s.toLowerCase()) {
    case 'ready':
    case 'completed':
      return 'text-green-400 bg-green-500/20 border-green-500/40';
    case 'running':
      return 'text-blue-400 bg-blue-500/20 border-blue-500/40';
    case 'draft':
    case 'queued':
      return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
    case 'beta':
      return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    default:
      return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
  }
};

// API run type
interface ApiRun {
  id: number;
  run_id: string;
  project_name: string | null;
  calculator_key: string | null;
  calculator_name: string | null;
  status: string;
  created_at: string;
}

// ─── Component ──────────────────────────────────────────────────────────
const Reports: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab: TabKey = pathMap[location.pathname] || 'pdf';

  const [runs, setRuns] = useState<ApiRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'pdf' || activeTab === 'docx' || activeTab === 'dxf') {
      setRunsLoading(true);
      apiClient
        .get('/runs?limit=20&status=completed')
        .then((res) => {
          setRuns(res.data.runs || []);
        })
        .catch(() => {})
        .finally(() => setRunsLoading(false));
    }
  }, [activeTab]);

  const downloadReport = (runId: string, format: 'pdf' | 'docx' | 'dxf' | 'xlsx') => {
    const token = localStorage.getItem('beaver-token');
    const baseUrl = apiClient.defaults.baseURL || '/api';
    const url = `${baseUrl}/runs/${runId}/report/${format}`;
    // Download via hidden link with auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${format}_report_${runId.slice(0, 8)}.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {});
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/3 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-60 right-1/4 w-28 h-28 bg-orange-500/8 rounded-full blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              Reports
            </span>
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            Generate, manage, and export calculation reports and CAD drawings
          </p>

          <div className="flex flex-wrap gap-6">
            {TAB_GROUPS.map((g) => (
              <div key={g.label} className="flex items-center gap-1">
                <span className="text-xs text-gray-600 font-semibold mr-1 flex items-center gap-1">
                  {g.icon} {g.label}:
                </span>
                {g.tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => navigate(tabPath[t.key])}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      activeTab === t.key
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10',
                    )}
                  >
                    {t.label}
                    {t.key === 'ifc' && (
                      <span className="ml-1 text-[10px] bg-amber-500/30 px-1.5 py-0.5 rounded-full">
                        BETA
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* PDF Reports */}
            {activeTab === 'pdf' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Completed Runs', value: runs.length, icon: <FiFileText /> },
                    {
                      label: 'Available for PDF',
                      value: runs.filter((r) => r.status === 'completed').length,
                      icon: <FiFile />,
                    },
                    {
                      label: 'Download Ready',
                      value: runs.filter((r) => r.status === 'completed').length,
                      icon: <FiDownload />,
                    },
                  ].map((s, i) => (
                    <Card key={i} className="bg-white/5 border-white/10">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center text-xl text-white shadow-lg">
                          {s.icon}
                        </div>
                        <div>
                          <span className="text-3xl font-black text-white">{s.value}</span>
                          <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {runsLoading ? (
                  <div className="p-8 text-center text-gray-500">Loading runs…</div>
                ) : runs.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No completed runs found. Run a calculation to generate reports.
                  </div>
                ) : (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            {['Run ID', 'Calculator', 'Project', 'Date', 'Status', ''].map((h) => (
                              <th
                                key={h}
                                className="text-left py-3 px-4 text-xs text-gray-500 font-semibold uppercase"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {runs.map((r) => (
                            <tr
                              key={r.run_id}
                              className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                            >
                              <td className="py-3 px-4 text-amber-400 font-mono text-xs font-bold">
                                {r.run_id.slice(0, 8)}
                              </td>
                              <td className="py-3 px-4 text-white font-medium">
                                {r.calculator_name || r.calculator_key}
                              </td>
                              <td className="py-3 px-4 text-gray-500 text-xs">
                                {r.project_name || '—'}
                              </td>
                              <td className="py-3 px-4 text-gray-500 text-xs">
                                {new Date(r.created_at).toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getStatusStyle(r.status)}`}
                                >
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadReport(r.run_id, 'pdf')}
                                    title="Download PDF"
                                  >
                                    <FiDownload size={14} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadReport(r.run_id, 'xlsx')}
                                    title="Download XLSX"
                                  >
                                    <FiGrid size={14} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* DOCX Reports */}
            {activeTab === 'docx' && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-0">
                  {runsLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading runs…</div>
                  ) : runs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No completed runs found.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          {['Run ID', 'Calculator', 'Project', 'Date', 'Status', ''].map((h) => (
                            <th
                              key={h}
                              className="text-left py-3 px-4 text-xs text-gray-500 font-semibold uppercase"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {runs.map((r) => (
                          <tr
                            key={r.run_id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4 text-amber-400 font-mono text-xs font-bold">
                              {r.run_id.slice(0, 8)}
                            </td>
                            <td className="py-3 px-4 text-white font-medium">
                              {r.calculator_name || r.calculator_key}
                            </td>
                            <td className="py-3 px-4 text-gray-500">{r.project_name || '—'}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {new Date(r.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getStatusStyle(r.status)}`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadReport(r.run_id, 'docx')}
                                  title="Download DOCX"
                                >
                                  <FiDownload size={14} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Batch Reports */}
            {activeTab === 'batch' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400">
                    Run multiple calculators and generate combined reports
                  </p>
                  <Button className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold rounded-xl">
                    <FiPlus className="mr-1" /> New Batch
                  </Button>
                </div>
                {batchJobs.map((b) => (
                  <Card
                    key={b.id}
                    className="bg-white/5 border-white/10 hover:border-white/20 transition-all"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400 font-mono text-xs font-bold">{b.id}</span>
                          <h3 className="text-white font-bold">{b.name}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getStatusStyle(b.status)}`}
                          >
                            {b.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{b.calcs} calculators</span>
                          <span>{b.duration}</span>
                          {b.status === 'running' && (
                            <FiRefreshCw className="animate-spin text-blue-400" />
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${b.progress === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                          style={{ width: `${b.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-2">{b.progress}% complete</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Method Statements */}
            {activeTab === 'method-statements' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {methodStatements.map((ms, i) => (
                  <motion.div
                    key={ms.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="bg-white/5 border-white/10 hover:border-amber-500/40 transition-all cursor-pointer group h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-red-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg">
                            <FiFileText size={18} />
                          </div>
                          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
                            {ms.uses} uses
                          </span>
                        </div>
                        <h3 className="text-white font-bold mb-1 group-hover:text-amber-400 transition-colors">
                          {ms.title}
                        </h3>
                        <p className="text-xs text-amber-400/80 font-semibold mb-2">
                          {ms.category} — {ms.standard}
                        </p>
                        <p className="text-xs text-gray-500">{ms.pages} pages</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* General Notes */}
            {activeTab === 'notes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notesPacks.map((np, i) => (
                  <motion.div
                    key={np.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="bg-white/5 border-white/10 hover:border-amber-500/40 transition-all cursor-pointer group h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg">
                            <FiLayers size={18} />
                          </div>
                          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
                            {np.uses} uses
                          </span>
                        </div>
                        <h3 className="text-white font-bold mb-1 group-hover:text-amber-400 transition-colors">
                          {np.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {np.sheets} sheet(s) — {np.standard}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* DXF Export */}
            {activeTab === 'dxf' && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-0">
                  {runsLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading runs…</div>
                  ) : runs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No completed runs found.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          {['Run ID', 'Calculator', 'Project', 'Date', ''].map((h) => (
                            <th
                              key={h}
                              className="text-left py-3 px-4 text-xs text-gray-500 font-semibold uppercase"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {runs.map((r) => (
                          <tr
                            key={r.run_id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4 text-amber-400 font-mono text-xs font-bold">
                              {r.run_id.slice(0, 8)}
                            </td>
                            <td className="py-3 px-4 text-white font-medium">
                              {r.calculator_name || r.calculator_key}
                            </td>
                            <td className="py-3 px-4 text-gray-500">{r.project_name || '—'}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {new Date(r.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadReport(r.run_id, 'dxf')}
                                  title="Download DXF"
                                >
                                  <FiDownload size={14} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* IFC Export */}
            {activeTab === 'ifc' && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                  <span className="text-amber-400 text-xl">⚠️</span>
                  <p className="text-amber-300 text-sm font-medium">
                    IFC Export is currently in <strong>Pilot</strong> mode. Exports are generated as
                    IFC4 and may not include all element metadata.
                  </p>
                </div>
                {ifcModels.map((m) => (
                  <Card
                    key={m.id}
                    className="bg-white/5 border-white/10 hover:border-white/20 transition-all"
                  >
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center text-2xl text-white shadow-lg">
                          🏗️
                        </div>
                        <div>
                          <h3 className="text-white font-bold mb-1">{m.title}</h3>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{m.elements} elements</span>
                            <span>{m.format}</span>
                            <span>{m.size}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full border font-bold ${getStatusStyle(m.status)}`}
                            >
                              {m.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" className="text-amber-400 border border-amber-500/40">
                        <FiDownload className="mr-2" /> Download
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Reports;
