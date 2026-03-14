import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { FiGlobe, FiLock, FiMonitor, FiSave, FiUser } from 'react-icons/fi';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../lib/AuthProvider';
import { useTheme } from '../lib/ThemeProvider';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>(() => {
    return (localStorage.getItem('beaver-units') as 'metric' | 'imperial') || 'metric';
  });
  const [defaultSteel, setDefaultSteel] = useState(() => localStorage.getItem('beaver-default-steel') || 'S355');
  const [defaultConcrete, setDefaultConcrete] = useState(() => localStorage.getItem('beaver-default-concrete') || 'C30/37');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('beaver-units', unitSystem);
    localStorage.setItem('beaver-default-steel', defaultSteel);
    localStorage.setItem('beaver-default-concrete', defaultConcrete);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-32 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Profile */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FiUser className="text-neon-cyan" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <p className="text-white">{user?.name || 'Not signed in'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <p className="text-white">{user?.email || '—'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Role</label>
                <span className="inline-flex items-center rounded-full bg-neon-cyan/20 px-3 py-1 text-xs font-medium text-neon-cyan capitalize">
                  {user?.role || 'guest'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FiMonitor className="text-neon-purple" /> Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Theme</p>
                  <p className="text-sm text-gray-400">Switch between dark and light mode</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="relative inline-flex h-8 w-16 items-center rounded-full bg-gray-700 transition-colors"
                  aria-label="Toggle theme"
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-1' : 'translate-x-9'
                    }`}
                  />
                  <span className="absolute left-2 text-xs">🌙</span>
                  <span className="absolute right-2 text-xs">☀️</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Engineering Defaults */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FiGlobe className="text-neon-blue" /> Engineering Defaults
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="unitSystem" className="block text-sm text-gray-400 mb-1">Unit System</label>
                <select
                  id="unitSystem"
                  title="Unit System"
                  value={unitSystem}
                  onChange={e => setUnitSystem(e.target.value as 'metric' | 'imperial')}
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white"
                >
                  <option value="metric">Metric (kN, m, MPa)</option>
                  <option value="imperial">Imperial (kips, ft, psi)</option>
                </select>
              </div>
              <div>
                <label htmlFor="defaultSteel" className="block text-sm text-gray-400 mb-1">Default Steel Grade</label>
                <select
                  id="defaultSteel"
                  title="Default Steel Grade"
                  value={defaultSteel}
                  onChange={e => setDefaultSteel(e.target.value)}
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white"
                >
                  <option value="S235">S235</option>
                  <option value="S275">S275</option>
                  <option value="S355">S355</option>
                  <option value="S460">S460</option>
                </select>
              </div>
              <div>
                <label htmlFor="defaultConcrete" className="block text-sm text-gray-400 mb-1">Default Concrete Class</label>
                <select
                  id="defaultConcrete"
                  title="Default Concrete Class"
                  value={defaultConcrete}
                  onChange={e => setDefaultConcrete(e.target.value)}
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white"
                >
                  <option value="C25/30">C25/30</option>
                  <option value="C30/37">C30/37</option>
                  <option value="C35/45">C35/45</option>
                  <option value="C40/50">C40/50</option>
                  <option value="C50/60">C50/60</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FiLock className="text-amber-400" /> Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 mb-4">
                Change your password. You'll need to enter your current password first.
              </p>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Current password"
                  title="Current password"
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500"
                />
                <input
                  type="password"
                  placeholder="New password"
                  title="New password"
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  title="Confirm new password"
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500"
                />
                <Button variant="outline" size="sm">
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2">
              <FiSave /> {saved ? 'Saved ✓' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
