import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FiBookmark,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiDatabase,
  FiDownload,
  FiEdit3,
  FiFile,
  FiFileText,
  FiFilter,
  FiFolder,
  FiGrid,
  FiLayers,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiTrendingUp,
  FiUpload,
  FiZap,
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { projectService } from '../api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { cn } from '../lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────
interface Project {
  id: string | number;
  name: string;
  client: string;
  status: 'active' | 'archived' | 'draft' | 'completed';
  createdAt: string;
  lastModified: string;
  runCount: number;
  fileCount: number;
  description?: string;
  project_number?: string;
}
interface RecentRun {
  id: string;
  projectId: string;
  projectName: string;
  calculator: string;
  status: 'completed' | 'running' | 'failed' | 'draft';
  createdAt: string;
  createdBy: string;
}
interface ProjectFile {
  id: string;
  name: string;
  type: 'dwg' | 'dxf' | 'pdf' | 'ifc' | 'xlsx';
  size: string;
  modified: string;
  project: string;
}
interface Issue {
  id: string;
  title: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  status: 'open' | 'in-review' | 'closed';
  assignee: string;
  raised: string;
  project: string;
}
interface Template {
  id: string;
  name: string;
  calculator: string;
  description: string;
  uses: number;
  lastUsed: string;
}
interface LoadSet {
  id: string;
  name: string;
  standard: string;
  combinations: number;
  factors: string;
  lastUsed: string;
}

// ─── Mock / Fallback Data ───────────────────────────────────────────────
const FALLBACK_PROJECTS: Project[] = [
  {
    id: 'BB1733',
    name: 'M25 Bridge Widening',
    client: 'Highways England',
    status: 'active',
    createdAt: '2025-10-15',
    lastModified: '2025-11-11',
    runCount: 47,
    fileCount: 23,
  },
  {
    id: 'BB1801',
    name: 'A3 Footbridge',
    client: 'Surrey County Council',
    status: 'active',
    createdAt: '2025-11-01',
    lastModified: '2025-11-10',
    runCount: 12,
    fileCount: 8,
  },
  {
    id: 'BB1695',
    name: 'Railway Underbridge Assessment',
    client: 'Network Rail',
    status: 'archived',
    createdAt: '2025-08-20',
    lastModified: '2025-09-30',
    runCount: 89,
    fileCount: 45,
  },
  {
    id: 'BB1820',
    name: 'A14 Temp Works Package',
    client: 'Balfour Beatty',
    status: 'active',
    createdAt: '2025-11-05',
    lastModified: '2025-11-12',
    runCount: 23,
    fileCount: 16,
  },
  {
    id: 'BB1750',
    name: 'HS2 Viaduct Section 4',
    client: 'HS2 Ltd',
    status: 'draft',
    createdAt: '2025-09-10',
    lastModified: '2025-10-28',
    runCount: 5,
    fileCount: 3,
  },
];
const recentRuns: RecentRun[] = [
  {
    id: 'run_a1b2c3',
    projectId: 'BB1733',
    projectName: 'M25 Bridge Widening',
    calculator: 'Steel Plate Girder',
    status: 'completed',
    createdAt: '2025-11-11 14:23',
    createdBy: 'M. Collins',
  },
  {
    id: 'run_d4e5f6',
    projectId: 'BB1801',
    projectName: 'A3 Footbridge',
    calculator: 'Crane Pad Design',
    status: 'completed',
    createdAt: '2025-11-11 11:45',
    createdBy: 'J. Smith',
  },
  {
    id: 'run_g7h8i9',
    projectId: 'BB1733',
    projectName: 'M25 Bridge Widening',
    calculator: 'RC Slab Bending',
    status: 'draft',
    createdAt: '2025-11-10 16:30',
    createdBy: 'M. Collins',
  },
  {
    id: 'run_j1k2l3',
    projectId: 'BB1820',
    projectName: 'A14 Temp Works Package',
    calculator: 'Working Platform',
    status: 'completed',
    createdAt: '2025-11-10 09:15',
    createdBy: 'A. Patel',
  },
  {
    id: 'run_m4n5o6',
    projectId: 'BB1801',
    projectName: 'A3 Footbridge',
    calculator: 'Bolted Connection',
    status: 'failed',
    createdAt: '2025-11-09 17:00',
    createdBy: 'J. Smith',
  },
];
const files: ProjectFile[] = [
  {
    id: 'f1',
    name: 'BB1733-GA-01.dwg',
    type: 'dwg',
    size: '4.2 MB',
    modified: '2025-11-10',
    project: 'M25 Bridge Widening',
  },
  {
    id: 'f2',
    name: 'BB1733-CALC-SPG-01.pdf',
    type: 'pdf',
    size: '1.8 MB',
    modified: '2025-11-11',
    project: 'M25 Bridge Widening',
  },
  {
    id: 'f3',
    name: 'BB1801-STR-MODEL.ifc',
    type: 'ifc',
    size: '15.6 MB',
    modified: '2025-11-09',
    project: 'A3 Footbridge',
  },
  {
    id: 'f4',
    name: 'BB1820-TW-CRANEPADS.dxf',
    type: 'dxf',
    size: '0.8 MB',
    modified: '2025-11-12',
    project: 'A14 Temp Works',
  },
  {
    id: 'f5',
    name: 'BB1733-QUANTITIES.xlsx',
    type: 'xlsx',
    size: '0.3 MB',
    modified: '2025-11-08',
    project: 'M25 Bridge Widening',
  },
  {
    id: 'f6',
    name: 'BB1695-ASSESS-REPORT.pdf',
    type: 'pdf',
    size: '6.1 MB',
    modified: '2025-09-30',
    project: 'Railway Underbridge',
  },
];
const issues: Issue[] = [
  {
    id: 'ISS-001',
    title: 'Girder G3 web panel shear utilisation at 98%',
    severity: 'critical',
    status: 'open',
    assignee: 'M. Collins',
    raised: '2025-11-10',
    project: 'M25 Bridge Widening',
  },
  {
    id: 'ISS-002',
    title: 'Bearing pad eccentricity exceeds 5mm tolerance',
    severity: 'major',
    status: 'in-review',
    assignee: 'J. Smith',
    raised: '2025-11-08',
    project: 'A3 Footbridge',
  },
  {
    id: 'ISS-003',
    title: 'TW design check missing for Stage 2 crane lift',
    severity: 'major',
    status: 'open',
    assignee: 'A. Patel',
    raised: '2025-11-11',
    project: 'A14 Temp Works',
  },
  {
    id: 'ISS-004',
    title: 'Concrete cover non-conformance at abutment kicker',
    severity: 'minor',
    status: 'closed',
    assignee: 'M. Collins',
    raised: '2025-10-25',
    project: 'M25 Bridge Widening',
  },
  {
    id: 'ISS-005',
    title: 'Method statement revision required for propping sequence',
    severity: 'observation',
    status: 'open',
    assignee: 'A. Patel',
    raised: '2025-11-12',
    project: 'A14 Temp Works',
  },
];
const templates: Template[] = [
  {
    id: 't1',
    name: 'Highway Bridge Steel Girder',
    calculator: 'Steel Plate Girder',
    description: 'Standard HA/HB loading, S355 steel, 25m span',
    uses: 34,
    lastUsed: '2025-11-11',
  },
  {
    id: 't2',
    name: 'Crane Pad — 100T Mobile',
    calculator: 'Crane Pad Design',
    description: '100T Liebherr, Category 2 ground, 6F2 platform',
    uses: 18,
    lastUsed: '2025-11-10',
  },
  {
    id: 't3',
    name: 'RC Deck Slab 250mm',
    calculator: 'RC Slab Bending',
    description: 'C40/50, 250mm slab, B25 rebar, EN 1992-1-1',
    uses: 27,
    lastUsed: '2025-11-09',
  },
  {
    id: 't4',
    name: 'M20 8.8 Bolted Splice',
    calculator: 'Bolted Connection',
    description: '6×M20, Grade 8.8, double lap, EN 1993-1-8',
    uses: 41,
    lastUsed: '2025-11-11',
  },
  {
    id: 't5',
    name: 'Temporary Hoarding 2.4m',
    calculator: 'Hoarding',
    description: '2.4m timber hoarding, BS 5975, 0.6 kN/m² wind',
    uses: 12,
    lastUsed: '2025-11-07',
  },
];
const loadSets: LoadSet[] = [
  {
    id: 'ls1',
    name: 'EN 1990 STR (UK NA)',
    standard: 'EN 1990',
    combinations: 12,
    factors: 'γG=1.35, γQ=1.50',
    lastUsed: '2025-11-11',
  },
  {
    id: 'ls2',
    name: 'BS 5400 Assessment',
    standard: 'BS 5400',
    combinations: 8,
    factors: 'γfL=1.20 (HA), γfL=1.10 (concrete)',
    lastUsed: '2025-11-08',
  },
  {
    id: 'ls3',
    name: 'BS 5975 TW Loads',
    standard: 'BS 5975',
    combinations: 6,
    factors: 'γ=1.50 (wind), γ=1.20 (imposed)',
    lastUsed: '2025-11-10',
  },
  {
    id: 'ls4',
    name: 'EN 1991-2 LM1+LM3',
    standard: 'EN 1991-2',
    combinations: 15,
    factors: 'αQ1=1.0, αq1=0.61 (UK)',
    lastUsed: '2025-11-09',
  },
  {
    id: 'ls5',
    name: 'EN 1997 GEO/STR',
    standard: 'EN 1997',
    combinations: 10,
    factors: 'DA1-C1: A1+M1+R1',
    lastUsed: '2025-11-06',
  },
];

// ─── Tab definitions ────────────────────────────────────────────────────
type TabKey = 'dashboard' | 'files' | 'issues' | 'templates' | 'libraries' | 'loadsets';
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <FiGrid size={16} /> },
  { key: 'files', label: 'Files', icon: <FiFile size={16} /> },
  { key: 'issues', label: 'Issues', icon: <FiCheckCircle size={16} /> },
  { key: 'templates', label: 'Templates', icon: <FiCopy size={16} /> },
  { key: 'libraries', label: 'Libraries', icon: <FiDatabase size={16} /> },
  { key: 'loadsets', label: 'Load Sets', icon: <FiLayers size={16} /> },
];

const pathToTab: Record<string, TabKey> = {
  '/projects': 'dashboard',
  '/projects/files': 'files',
  '/projects/issues': 'issues',
  '/projects/templates': 'templates',
  '/projects/libraries': 'libraries',
  '/projects/loadsets': 'loadsets',
};
const tabToPath: Record<TabKey, string> = Object.fromEntries(
  Object.entries(pathToTab).map(([p, t]) => [t, p]),
) as Record<TabKey, string>;

const getStatusColor = (s: string) => {
  switch (s) {
    case 'completed':
    case 'active':
    case 'closed':
      return 'text-green-400 bg-green-500/20 border-green-500/40';
    case 'running':
    case 'in-review':
      return 'text-blue-400 bg-blue-500/20 border-blue-500/40';
    case 'failed':
    case 'critical':
      return 'text-red-400 bg-red-500/20 border-red-500/40';
    case 'major':
      return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
    case 'minor':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
    default:
      return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
  }
};
const fileTypeIcon: Record<string, string> = {
  dwg: '📐',
  dxf: '📏',
  pdf: '📄',
  ifc: '🏗️',
  xlsx: '📊',
};

// ─── Component ──────────────────────────────────────────────────────────
const Projects: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab: TabKey = pathToTab[location.pathname] || 'dashboard';
  const setTab = (t: TabKey) => navigate(tabToPath[t]);
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [isOnline, setIsOnline] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await projectService.list();
      if (data.projects && data.projects.length > 0) {
        setProjects(
          data.projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            client: p.client || '',
            status: p.status || 'active',
            createdAt: p.created_at?.split('T')[0] || '',
            lastModified: p.created_at?.split('T')[0] || '',
            runCount: p.run_count ?? 0,
            fileCount: p.file_count ?? 0,
            description: p.description,
            project_number: p.project_number,
          })),
        );
        setIsOnline(true);
      }
    } catch {
      // API unavailable — keep fallback data
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async () => {
    if (!newName.trim()) return;
    try {
      await projectService.create({
        name: newName,
        client: newClient || undefined,
        project_number: newNumber || undefined,
      });
      setNewName('');
      setNewClient('');
      setNewNumber('');
      setShowNewProject(false);
      fetchProjects();
    } catch {
      // Offline — add to local list
      const id = `P${Date.now()}`;
      setProjects((prev) => [
        ...prev,
        {
          id,
          name: newName,
          client: newClient,
          status: 'active',
          createdAt: new Date().toISOString().split('T')[0],
          lastModified: new Date().toISOString().split('T')[0],
          runCount: 0,
          fileCount: 0,
          project_number: newNumber,
        },
      ]);
      setNewName('');
      setNewClient('');
      setNewNumber('');
      setShowNewProject(false);
    }
  };

  const handleDeleteProject = async (id: string | number) => {
    try {
      await projectService.delete(Number(id));
      fetchProjects();
    } catch {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/3 w-24 h-24 bg-purple-500/8 rounded-full blur-2xl" />
        <div className="absolute bottom-20 left-1/2 w-40 h-40 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Projects
                </span>
              </h1>
              <p className="text-gray-400 text-lg">
                Manage projects, track calculations, and generate reports
                {!isOnline && (
                  <span className="ml-2 text-xs text-yellow-400">(offline — demo data)</span>
                )}
              </p>
            </div>
            <Button
              onClick={() => setShowNewProject(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-blue-500/25"
            >
              <FiPlus className="mr-2" /> New Project
            </Button>
          </div>

          {/* New Project Modal */}
          <AnimatePresence>
            {showNewProject && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-white font-bold text-lg">Create New Project</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Project name *"
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                      <input
                        value={newClient}
                        onChange={(e) => setNewClient(e.target.value)}
                        placeholder="Client"
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                      <input
                        value={newNumber}
                        onChange={(e) => setNewNumber(e.target.value)}
                        placeholder="Project number"
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleCreateProject}
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-bold rounded-xl"
                      >
                        Create
                      </Button>
                      <Button
                        onClick={() => setShowNewProject(false)}
                        variant="ghost"
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap',
                  activeTab === t.key
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5',
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardTab projects={projects} onDelete={handleDeleteProject} />
            )}
            {activeTab === 'files' && <FilesTab search={search} setSearch={setSearch} />}
            {activeTab === 'issues' && <IssuesTab />}
            {activeTab === 'templates' && <TemplatesTab />}
            {activeTab === 'libraries' && <LibrariesSubTab />}
            {activeTab === 'loadsets' && <LoadSetsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Dashboard Tab ──────────────────────────────────────────────────────
const DashboardTab = ({
  projects,
  onDelete,
}: {
  projects: Project[];
  onDelete: (id: string | number) => void;
}) => (
  <div className="space-y-8">
    {/* Stat Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        {
          label: 'Active Projects',
          value: projects.filter((p) => p.status === 'active').length,
          trend: '+12%',
          icon: <FiFolder />,
          gradient: 'from-blue-600 to-cyan-500',
          glow: 'shadow-blue-500/25',
        },
        {
          label: 'Total Calculations',
          value: projects.reduce((s, p) => s + p.runCount, 0),
          trend: '148 this week',
          icon: <FiCheckCircle />,
          gradient: 'from-purple-600 to-pink-500',
          glow: 'shadow-purple-500/25',
        },
        {
          label: 'Total Files',
          value: projects.reduce((s, p) => s + p.fileCount, 0),
          trend: '12 downloads',
          icon: <FiFileText />,
          gradient: 'from-emerald-600 to-green-400',
          glow: 'shadow-emerald-500/25',
        },
      ].map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all group overflow-hidden relative">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}
            />
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-2xl text-white shadow-xl ${s.glow} group-hover:scale-110 transition-transform`}
                >
                  {s.icon}
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-white">{s.value}</span>
                  <div className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1">
                    <FiTrendingUp size={12} className="text-green-400" /> {s.trend}
                  </div>
                </div>
              </div>
              <h3 className="text-gray-300 font-bold text-lg">{s.label}</h3>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>

    {/* Recent Calculations */}
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <FiZap className="text-white" />
          </div>
          <CardTitle className="text-2xl font-black text-white">Recent Calculations</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentRuns.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.07] transition-all cursor-pointer group flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-white font-bold group-hover:text-cyan-400 transition-colors">
                  {r.calculator}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getStatusColor(r.status)}`}
                >
                  {r.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <FiFolder size={12} /> {r.projectName}
                </span>
                <span className="flex items-center gap-1">
                  <FiClock size={12} /> {r.createdAt}
                </span>
                <span>{r.createdBy}</span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm">
                <FiEdit3 size={14} />
              </Button>
              <Button variant="ghost" size="sm">
                <FiDownload size={14} />
              </Button>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>

    {/* Active Projects Grid */}
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
            <FiFolder className="text-white" />
          </div>
          <CardTitle className="text-2xl font-black text-white">Active Projects</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects
            .filter((p) => p.status === 'active')
            .map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl text-white shadow-lg group-hover:scale-110 transition-transform">
                    <FiFolder />
                  </div>
                  <span className="text-xs text-gray-400 bg-white/10 px-2.5 py-1 rounded-full font-bold">
                    {p.id}
                  </span>
                </div>
                <h3 className="text-white font-black text-lg mb-1 group-hover:text-cyan-400 transition-colors">
                  {p.name}
                </h3>
                <p className="text-gray-400 text-sm mb-3">{p.client}</p>
                <div className="flex items-center justify-between gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <FiZap size={11} className="text-cyan-400" /> {p.runCount} runs
                    </span>
                    <span className="flex items-center gap-1">
                      <FiFileText size={11} className="text-purple-400" /> {p.fileCount} files
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(p.id);
                    }}
                    title="Delete project"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// ─── Files Tab ──────────────────────────────────────────────────────────
const FilesTab = ({ search, setSearch }: { search: string; setSearch: (s: string) => void }) => {
  const filtered = files.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.project.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-cyan-500/40 transition-colors cursor-pointer group">
        <FiUpload className="mx-auto text-3xl text-gray-500 group-hover:text-cyan-400 mb-3 transition-colors" />
        <p className="text-gray-400 font-semibold">
          Drop files here or <span className="text-cyan-400">browse</span>
        </p>
        <p className="text-xs text-gray-600 mt-1">DWG, DXF, IFC, PDF, XLSX — up to 50 MB</p>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <Button variant="ghost" className="border border-white/10 text-gray-400 hover:text-white">
          <FiFilter size={16} className="mr-2" /> Filter
        </Button>
      </div>

      {/* File list */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                  File
                </th>
                <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                  Type
                </th>
                <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                  Project
                </th>
                <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                  Size
                </th>
                <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                  Modified
                </th>
                <th className="py-3 px-5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <td className="py-3 px-5 text-white font-medium flex items-center gap-2">
                    <span>{fileTypeIcon[f.type] || '📁'}</span> {f.name}
                  </td>
                  <td className="py-3 px-5 text-xs text-gray-400 uppercase font-bold">{f.type}</td>
                  <td className="py-3 px-5 text-sm text-gray-400">{f.project}</td>
                  <td className="py-3 px-5 text-sm text-gray-500">{f.size}</td>
                  <td className="py-3 px-5 text-sm text-gray-500">{f.modified}</td>
                  <td className="py-3 px-5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm">
                        <FiDownload size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-400">
                        <FiTrash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Issues Tab ─────────────────────────────────────────────────────────
const IssuesTab = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {['all', 'open', 'in-review', 'closed'].map((s) => (
          <span
            key={s}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 cursor-pointer transition-all"
          >
            {s.toUpperCase()}
          </span>
        ))}
      </div>
      <Button className="bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-bold rounded-xl">
        <FiPlus className="mr-1" /> Raise Issue
      </Button>
    </div>

    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                ID
              </th>
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Issue
              </th>
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Severity
              </th>
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Status
              </th>
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Project
              </th>
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Assignee
              </th>
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Raised
              </th>
            </tr>
          </thead>
          <tbody>
            {issues.map((iss) => (
              <tr
                key={iss.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <td className="py-3 px-5 text-cyan-400 font-mono text-xs font-bold">{iss.id}</td>
                <td className="py-3 px-5 text-white text-sm font-medium max-w-md">{iss.title}</td>
                <td className="py-3 px-5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getStatusColor(iss.severity)}`}
                  >
                    {iss.severity.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getStatusColor(iss.status)}`}
                  >
                    {iss.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-5 text-sm text-gray-400">{iss.project}</td>
                <td className="py-3 px-5 text-sm text-gray-400">{iss.assignee}</td>
                <td className="py-3 px-5 text-sm text-gray-500">{iss.raised}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
);

// ─── Templates Tab ──────────────────────────────────────────────────────
const TemplatesTab = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <p className="text-gray-400">
        Saved input assumptions — click to apply to a new calculation run
      </p>
      <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-xl">
        <FiPlus className="mr-1" /> Save Current
      </Button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((t, i) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <Card className="bg-white/5 border-white/10 hover:border-purple-500/40 transition-all cursor-pointer group h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg">
                  <FiBookmark size={18} />
                </div>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
                  {t.uses} uses
                </span>
              </div>
              <h3 className="text-white font-bold text-base mb-1 group-hover:text-purple-400 transition-colors">
                {t.name}
              </h3>
              <p className="text-xs text-cyan-400 font-semibold mb-2">{t.calculator}</p>
              <p className="text-xs text-gray-500 mb-3">{t.description}</p>
              <p className="text-xs text-gray-600">Last used: {t.lastUsed}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  </div>
);

// ─── Libraries Sub-Tab ──────────────────────────────────────────────────
const LibrariesSubTab = () => {
  const matLibs = [
    { name: 'Steel Grades', icon: '🔩', count: 12, desc: 'S275, S355, S460 — UK NA values' },
    { name: 'Concrete Classes', icon: '🧱', count: 14, desc: 'C20/25 to C50/60 — EN 1992' },
    { name: 'Timber Species', icon: '🌲', count: 8, desc: 'C16, C24, D30 — EN 338' },
    { name: 'Section Catalogues', icon: '📏', count: 320, desc: 'UKB/UKC/PFC/RHS/CHS' },
  ];
  return (
    <div className="space-y-6">
      <p className="text-gray-400">
        Project-scoped material and section libraries — override global defaults per project
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matLibs.map((m, i) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="bg-white/5 border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                  {m.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold group-hover:text-cyan-400 transition-colors">
                    {m.name}
                  </h3>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </div>
                <span className="text-2xl font-black text-gray-600">{m.count}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── Load Sets Tab ──────────────────────────────────────────────────────
const LoadSetsTab = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <p className="text-gray-400">Reusable load combinations — apply to any calculator</p>
      <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold rounded-xl">
        <FiPlus className="mr-1" /> New Load Set
      </Button>
    </div>
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Name
              </th>
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Standard
              </th>
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Combinations
              </th>
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Factors
              </th>
              <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase">
                Last Used
              </th>
              <th className="py-3 px-5" />
            </tr>
          </thead>
          <tbody>
            {loadSets.map((ls) => (
              <tr
                key={ls.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <td className="py-3 px-5 text-white font-bold">{ls.name}</td>
                <td className="py-3 px-5">
                  <span className="text-xs px-2 py-0.5 rounded-full border border-cyan-500/40 text-cyan-400 font-bold">
                    {ls.standard}
                  </span>
                </td>
                <td className="py-3 px-5 text-sm text-gray-300 font-mono">{ls.combinations}</td>
                <td className="py-3 px-5 text-xs text-gray-500 font-mono">{ls.factors}</td>
                <td className="py-3 px-5 text-sm text-gray-500">{ls.lastUsed}</td>
                <td className="py-3 px-5">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm">
                      <FiEdit3 size={14} />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <FiCopy size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
);

export default Projects;
