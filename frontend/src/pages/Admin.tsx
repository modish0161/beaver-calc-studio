import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import {
  FiCheckCircle,
  FiEdit3,
  FiPlus,
  FiSettings,
  FiToggleLeft,
  FiToggleRight,
  FiUsers,
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';

// ─── Types & Tabs ───────────────────────────────────────────────────────
type TabKey = 'users' | 'permissions' | 'calculators' | 'audit' | 'integrations' | 'features';

const TAB_GROUPS = [
  {
    label: 'User Management',
    icon: <FiUsers size={14} />,
    tabs: [
      { key: 'users' as TabKey, label: 'Users & Roles' },
      { key: 'permissions' as TabKey, label: 'Permissions' },
    ],
  },
  {
    label: 'System',
    icon: <FiSettings size={14} />,
    tabs: [
      { key: 'calculators' as TabKey, label: 'Calculators' },
      { key: 'audit' as TabKey, label: 'Audit Log' },
      { key: 'integrations' as TabKey, label: 'Integrations' },
      { key: 'features' as TabKey, label: 'Feature Flags' },
    ],
  },
];

const pathMap: Record<string, TabKey> = {
  '/admin': 'users',
  '/admin/users': 'users',
  '/admin/permissions': 'permissions',
  '/admin/calculators': 'calculators',
  '/admin/audit': 'audit',
  '/admin/integrations': 'integrations',
  '/admin/features': 'features',
};
const tabPath: Record<TabKey, string> = {
  users: '/admin/users',
  permissions: '/admin/permissions',
  calculators: '/admin/calculators',
  audit: '/admin/audit',
  integrations: '/admin/integrations',
  features: '/admin/features',
};

// ── Mock Data ───────────────────────────────────────────────────────────
const users = [
  {
    id: 'u1',
    name: 'Matthew Collins',
    email: 'matt@beaverbridges.co.uk',
    role: 'Admin',
    status: 'Active',
    lastLogin: '2025-11-12 09:15',
    runs: 234,
  },
  {
    id: 'u2',
    name: 'James Smith',
    email: 'james@beaverbridges.co.uk',
    role: 'Engineer',
    status: 'Active',
    lastLogin: '2025-11-12 08:42',
    runs: 156,
  },
  {
    id: 'u3',
    name: 'Alisha Patel',
    email: 'alisha@beaverbridges.co.uk',
    role: 'Engineer',
    status: 'Active',
    lastLogin: '2025-11-11 17:30',
    runs: 89,
  },
  {
    id: 'u4',
    name: 'David Chen',
    email: 'david@beaverbridges.co.uk',
    role: 'Viewer',
    status: 'Active',
    lastLogin: '2025-11-10 14:20',
    runs: 12,
  },
  {
    id: 'u5',
    name: 'Sarah Thompson',
    email: 'sarah@external.com',
    role: 'Viewer',
    status: 'Invited',
    lastLogin: '—',
    runs: 0,
  },
];

const roles = ['Admin', 'Engineer', 'Checker', 'Viewer'];
const permissions = [
  { action: 'Create Calculations', Admin: true, Engineer: true, Checker: false, Viewer: false },
  { action: 'Edit Calculations', Admin: true, Engineer: true, Checker: false, Viewer: false },
  { action: 'Approve / Sign-off', Admin: true, Engineer: false, Checker: true, Viewer: false },
  { action: 'Delete Calculations', Admin: true, Engineer: false, Checker: false, Viewer: false },
  { action: 'Export PDF / DOCX', Admin: true, Engineer: true, Checker: true, Viewer: true },
  { action: 'Export DXF / IFC', Admin: true, Engineer: true, Checker: false, Viewer: false },
  { action: 'Manage Projects', Admin: true, Engineer: true, Checker: false, Viewer: false },
  { action: 'Manage Users', Admin: true, Engineer: false, Checker: false, Viewer: false },
  { action: 'View Audit Log', Admin: true, Engineer: false, Checker: true, Viewer: false },
  { action: 'Manage Feature Flags', Admin: true, Engineer: false, Checker: false, Viewer: false },
];

const calculatorList = [
  {
    name: 'Steel Plate Girder',
    category: 'Bridges',
    status: 'Enabled',
    badge: 'verified',
    runs7d: 34,
    version: '2.1.0',
  },
  {
    name: 'Crane Pad Design',
    category: 'Temporary Works',
    status: 'Enabled',
    badge: 'verified',
    runs7d: 28,
    version: '1.8.0',
  },
  {
    name: 'RC Slab Bending',
    category: 'Structures',
    status: 'Enabled',
    badge: 'verified',
    runs7d: 22,
    version: '2.0.0',
  },
  {
    name: 'Working Platform',
    category: 'Temporary Works',
    status: 'Enabled',
    badge: 'verified',
    runs7d: 19,
    version: '1.5.0',
  },
  {
    name: 'Sensitivity Analysis',
    category: 'Bridges',
    status: 'Enabled',
    badge: 'new',
    runs7d: 8,
    version: '1.0.0',
  },
  {
    name: 'IFC Export',
    category: 'Reports',
    status: 'Beta',
    badge: 'beta',
    runs7d: 3,
    version: '0.2.0',
  },
  {
    name: 'AI Chat Assistant',
    category: 'System',
    status: 'Disabled',
    badge: 'beta',
    runs7d: 0,
    version: '0.1.0',
  },
];

const auditLog: {
  timestamp: string;
  user: string;
  action: string;
  detail: string;
  severity: string;
}[] = []; // loaded from API

// Audit log entry from API
interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: number;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

const integrations = [
  {
    name: 'BIM 360 / ACC',
    icon: '🏗️',
    status: 'Connected',
    description: 'Autodesk Construction Cloud sync',
    lastSync: '2025-11-12 08:00',
  },
  {
    name: 'SharePoint',
    icon: '📁',
    status: 'Connected',
    description: 'Document library integration',
    lastSync: '2025-11-12 09:00',
  },
  {
    name: 'Webhook API',
    icon: '🔗',
    status: 'Active',
    description: 'POST to external endpoint on calc completion',
    lastSync: '—',
  },
  {
    name: 'Azure AD SSO',
    icon: '🔐',
    status: 'Configured',
    description: 'Single sign-on via Microsoft Entra',
    lastSync: '—',
  },
  {
    name: 'Tekla Structures',
    icon: '📐',
    status: 'Coming Soon',
    description: 'BIM model sync (in development)',
    lastSync: '—',
  },
];

const featureFlags = [
  {
    name: 'ifc_export',
    label: 'IFC Export (Pilot)',
    description: 'Enable IFC4 model export from calculators',
    enabled: true,
    scope: 'All users',
  },
  {
    name: 'ai_chat',
    label: 'AI Chat Assistant',
    description: 'GPT-powered calculation helper and code review',
    enabled: false,
    scope: 'Admin only',
  },
  {
    name: 'batch_reports',
    label: 'Batch Report Generator',
    description: 'Multi-calculator batch PDF export',
    enabled: true,
    scope: 'All users',
  },
  {
    name: 'dark_mode_v2',
    label: 'Dark Mode V2',
    description: 'Enhanced dark theme with OLED-optimised colours',
    enabled: true,
    scope: 'All users',
  },
  {
    name: 'real_time_collab',
    label: 'Real-time Collaboration',
    description: 'Multi-user live editing on calculations',
    enabled: false,
    scope: 'Beta testers',
  },
  {
    name: 'mobile_app',
    label: 'Mobile App Access',
    description: 'Progressive Web App for site use',
    enabled: false,
    scope: 'Coming Q2',
  },
];

const getRoleColor = (r: string) => {
  switch (r) {
    case 'Admin':
      return 'text-red-400 bg-red-500/20 border-red-500/40';
    case 'Engineer':
      return 'text-blue-400 bg-blue-500/20 border-blue-500/40';
    case 'Checker':
      return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    case 'Viewer':
      return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
    default:
      return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
  }
};
const getSeverityColor = (s: string) => {
  switch (s) {
    case 'error':
      return 'text-red-400';
    case 'warning':
      return 'text-amber-400';
    default:
      return 'text-gray-500';
  }
};
const getStatusColor = (s: string) => {
  switch (s.toLowerCase()) {
    case 'enabled':
    case 'connected':
    case 'active':
    case 'configured':
      return 'text-green-400 bg-green-500/20 border-green-500/40';
    case 'beta':
      return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    case 'disabled':
    case 'coming soon':
      return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
    case 'invited':
      return 'text-purple-400 bg-purple-500/20 border-purple-500/40';
    default:
      return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
  }
};

// ─── Component ──────────────────────────────────────────────────────────
const Admin: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab: TabKey = pathMap[location.pathname] || 'users';
  const [flagStates, setFlagStates] = useState<Record<string, boolean>>(
    Object.fromEntries(featureFlags.map((f) => [f.name, f.enabled])),
  );

  // Real API data
  const [apiAuditLogs, setApiAuditLogs] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [apiCalculators, setApiCalculators] = useState<
    { key: string; name: string; category: string; version: string }[]
  >([]);

  useEffect(() => {
    if (activeTab === 'audit') {
      setAuditLoading(true);
      apiClient
        .get('/audit?limit=50')
        .then((res) => {
          setApiAuditLogs(res.data.audit_logs || []);
        })
        .catch(() => {})
        .finally(() => setAuditLoading(false));
    }
    if (activeTab === 'calculators') {
      apiClient
        .get('/calculators')
        .then((res) => {
          setApiCalculators(res.data.calculators || []);
        })
        .catch(() => {});
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/3 w-32 h-32 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute top-60 left-1/4 w-28 h-28 bg-rose-500/8 rounded-full blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-red-400 via-rose-400 to-pink-400 bg-clip-text text-transparent">
              Admin
            </span>
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            System administration, user management, and configuration
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
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/20'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10',
                    )}
                  >
                    {t.label}
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
            {/* Users */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400">{users.length} users registered</p>
                  <Button className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-bold rounded-xl">
                    <FiPlus className="mr-1" /> Invite User
                  </Button>
                </div>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Runs', ''].map(
                            (h) => (
                              <th
                                key={h}
                                className="text-left py-3 px-4 text-xs text-gray-500 font-semibold uppercase"
                              >
                                {h}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr
                            key={u.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4 text-white font-bold flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center text-xs font-black text-white">
                                {u.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </div>
                              {u.name}
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-xs">{u.email}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getRoleColor(u.role)}`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getStatusColor(u.status)}`}
                              >
                                {u.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{u.lastLogin}</td>
                            <td className="py-3 px-4 text-gray-400 font-mono">{u.runs}</td>
                            <td className="py-3 px-4">
                              <Button variant="ghost" size="sm">
                                <FiEdit3 size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Permissions */}
            {activeTab === 'permissions' && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-5 text-xs text-gray-500 font-semibold uppercase min-w-[200px]">
                          Action
                        </th>
                        {roles.map((r) => (
                          <th
                            key={r}
                            className="text-center py-3 px-5 text-xs text-gray-500 font-semibold uppercase"
                          >
                            {r}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {permissions.map((p) => (
                        <tr
                          key={p.action}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 px-5 text-white font-medium">{p.action}</td>
                          {roles.map((r) => (
                            <td key={r} className="py-3 px-5 text-center">
                              {(p as any)[r] ? (
                                <FiCheckCircle className="inline text-green-400" size={18} />
                              ) : (
                                <span className="text-gray-700">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Calculator Manager */}
            {activeTab === 'calculators' && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        {['Calculator', 'Key', 'Category', 'Version'].map((h) => (
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
                      {(apiCalculators.length > 0
                        ? apiCalculators
                        : calculatorList.map((c) => ({
                            key: c.name,
                            name: c.name,
                            category: c.category,
                            version: c.version,
                          }))
                      ).map((c) => (
                        <tr
                          key={c.key}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 px-4 text-white font-bold">{c.name}</td>
                          <td className="py-3 px-4 text-gray-500 font-mono text-xs">{c.key}</td>
                          <td className="py-3 px-4 text-gray-400 text-xs">{c.category}</td>
                          <td className="py-3 px-4 text-gray-500 font-mono text-xs">{c.version}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 border-t border-white/10 text-xs text-gray-600">
                    {apiCalculators.length > 0
                      ? `${apiCalculators.length} calculators loaded from API`
                      : 'Showing placeholder data — connect to backend for live list'}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audit Log */}
            {activeTab === 'audit' && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-0">
                  {auditLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading audit logs…</div>
                  ) : apiAuditLogs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No audit log entries found. Actions will appear here once users interact with
                      the system.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          {['Timestamp', 'User', 'Action', 'Resource', 'Detail', 'IP'].map((h) => (
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
                        {apiAuditLogs.map((a) => (
                          <tr
                            key={a.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4 text-gray-500 font-mono text-xs whitespace-nowrap">
                              {new Date(a.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-white font-medium text-xs">{a.actor}</td>
                            <td
                              className={`py-3 px-4 font-bold text-xs ${a.action.includes('fail') || a.action.includes('delete') ? 'text-red-400' : a.action.includes('signoff') ? 'text-amber-400' : 'text-gray-400'}`}
                            >
                              {a.action}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {a.resource_type} #{a.resource_id}
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-xs max-w-xs truncate">
                              {a.details ? JSON.stringify(a.details) : '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-xs font-mono">
                              {a.ip_address || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Integrations */}
            {activeTab === 'integrations' && (
              <div className="space-y-4">
                {integrations.map((integ, i) => (
                  <motion.div
                    key={integ.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600/50 to-rose-500/50 flex items-center justify-center text-2xl shadow-lg border border-white/10">
                            {integ.icon}
                          </div>
                          <div>
                            <h3 className="text-white font-bold">{integ.name}</h3>
                            <p className="text-xs text-gray-500">{integ.description}</p>
                            {integ.lastSync !== '—' && (
                              <p className="text-xs text-gray-600 mt-1">
                                Last sync: {integ.lastSync}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-3 py-1 rounded-full border font-bold ${getStatusColor(integ.status)}`}
                        >
                          {integ.status}
                        </span>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Feature Flags */}
            {activeTab === 'features' && (
              <div className="space-y-4">
                {featureFlags.map((f, i) => (
                  <motion.div
                    key={f.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() =>
                              setFlagStates((prev) => ({ ...prev, [f.name]: !prev[f.name] }))
                            }
                            className="focus:outline-none"
                            aria-label={`Toggle ${f.label}`}
                          >
                            {flagStates[f.name] ? (
                              <FiToggleRight size={32} className="text-green-400" />
                            ) : (
                              <FiToggleLeft size={32} className="text-gray-600" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-bold">{f.label}</h3>
                              <span className="text-xs text-gray-600 font-mono bg-white/5 px-2 py-0.5 rounded">
                                {f.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{f.description}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">
                          {f.scope}
                        </span>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Admin;
