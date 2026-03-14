import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { FiBook, FiCode, FiFileText, FiHelpCircle, FiSearch } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const designCodes = [
  { code: 'EN 1990', title: 'Basis of Structural Design', area: 'General' },
  { code: 'EN 1991-1-1', title: 'Densities, Self-weight and Imposed Loads', area: 'Actions' },
  { code: 'EN 1991-1-4', title: 'Wind Actions', area: 'Actions' },
  { code: 'EN 1991-2', title: 'Traffic Loads on Bridges', area: 'Actions' },
  { code: 'EN 1992-1-1', title: 'Design of Concrete Structures', area: 'Concrete' },
  { code: 'EN 1993-1-1', title: 'Design of Steel Structures — General', area: 'Steel' },
  { code: 'EN 1993-1-5', title: 'Plated Structural Elements', area: 'Steel' },
  { code: 'EN 1993-1-8', title: 'Design of Joints', area: 'Steel' },
  { code: 'EN 1994-1-1', title: 'Composite Steel–Concrete Structures', area: 'Composite' },
  { code: 'EN 1995-1-1', title: 'Design of Timber Structures', area: 'Timber' },
  { code: 'EN 1997-1', title: 'Geotechnical Design — General', area: 'Geotechnical' },
  { code: 'EN 1998-1', title: 'Seismic Actions and Design', area: 'Seismic' },
  { code: 'BS 5975', title: 'Temporary Works — Procedures and Permissible Stress Design', area: 'Temporary Works' },
  { code: 'BS 6399', title: 'Loading for Buildings', area: 'Actions' },
  { code: 'CIRIA C760', title: 'Guidance on Embedded Retaining Wall Design', area: 'Geotechnical' },
];

const faqItems = [
  {
    q: 'How are partial factors applied?',
    a: 'All calculators apply EN 1990 partial factors automatically. ULS combinations use γG=1.35 / γQ=1.5 (STR/GEO). SLS uses γ=1.0. You can override these in the advanced settings of each calculator.',
  },
  {
    q: 'Can I use this for checking / independent verification?',
    a: 'Yes. Use the checker role to add verification signatures. Results include full calculation chains so all steps are traceable.',
  },
  {
    q: 'What steel section data is included?',
    a: 'The database includes UK Universal Beams (UB), Universal Columns (UC), Parallel Flange Channels (PFC), and Universal Bearing Piles (UBP) conforming to BS 4-1:2005.',
  },
  {
    q: 'How do I generate a PDF report?',
    a: 'Click "Generate PDF" on any calculator results page. Reports include inputs, full calculation steps, references, and a compliance summary. Multiple runs can be compiled into a single project report.',
  },
  {
    q: 'Are the 3D visualisations to scale?',
    a: 'Yes. The 3D scenes render dimensions based on your inputs. You can orbit, zoom, and pan to inspect the structural element from any angle.',
  },
  {
    q: 'Is my data stored securely?',
    a: 'Calculations are processed locally in your browser — no data leaves your device unless you explicitly save to a project (backend). Backend data is encrypted at rest and in transit.',
  },
];

const Help: React.FC = () => {
  const [search, setSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const filteredCodes = designCodes.filter(
    c =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.area.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFaq = faqItems.filter(
    f =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-32 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Help & Documentation</h1>
        <p className="text-gray-400 mb-8">Design code references, FAQs, and keyboard shortcuts</p>

        {/* Search */}
        <div className="relative mb-8">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            title="Search help topics"
            placeholder="Search codes, FAQs, shortcuts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800/80 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan/50 outline-none"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Design Codes Reference */}
          <Card variant="glass" className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FiBook className="text-neon-cyan" /> Design Codes Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 pr-4 text-gray-400 font-medium">Code</th>
                      <th className="text-left py-2 pr-4 text-gray-400 font-medium">Title</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCodes.map(c => (
                      <tr key={c.code} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-2 pr-4 text-neon-cyan font-mono text-xs">{c.code}</td>
                        <td className="py-2 pr-4 text-white">{c.title}</td>
                        <td className="py-2">
                          <span className="text-xs bg-gray-700/60 px-2 py-0.5 rounded-full text-gray-300">
                            {c.area}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FiHelpCircle className="text-neon-purple" /> FAQ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredFaq.map((item, i) => (
                <div key={i} className="border-b border-gray-800 last:border-0 pb-3 last:pb-0">
                  <button
                    className="w-full text-left text-white font-medium text-sm hover:text-neon-cyan transition-colors"
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    {...{ "aria-expanded": expandedFaq === i }}
                  >
                    {item.q}
                  </button>
                  {expandedFaq === i && (
                    <p className="mt-2 text-sm text-gray-400 leading-relaxed">{item.a}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FiCode className="text-amber-400" /> Keyboard Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  ['Ctrl + K', 'Open global search'],
                  ['Ctrl + Q', 'Toggle quick calculator'],
                  ['Escape', 'Close panels/menus'],
                  ['Ctrl + P', 'Generate PDF report'],
                  ['Ctrl + S', 'Save calculation'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-400">{desc}</span>
                    <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 font-mono">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card variant="glass" className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FiFileText className="text-green-400" /> Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-invert prose-sm max-w-none">
              <ol className="text-gray-300 space-y-3">
                <li><strong className="text-white">Choose a calculator</strong> — Browse categories in the navigation bar or use Ctrl+K to search.</li>
                <li><strong className="text-white">Enter your inputs</strong> — Fill in geometry, material properties, and loading. Hover over any field label for tooltip guidance.</li>
                <li><strong className="text-white">Review results</strong> — The Results tab shows utilisation ratios, pass/fail checks, and design summaries.</li>
                <li><strong className="text-white">Visualise</strong> — Switch to the Visualization tab for a 3D interactive view of your element.</li>
                <li><strong className="text-white">Export</strong> — Generate a PDF report with full calculation chains and EN standard references.</li>
                <li><strong className="text-white">Save to project</strong> — Organise calculations into projects for easy retrieval and reporting.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default Help;
