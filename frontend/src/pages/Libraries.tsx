import { AnimatePresence, motion } from 'framer-motion'
import React, { useState } from 'react'
import {
    FiBook,
    FiDatabase,
    FiDownload,
    FiGrid,
    FiLayers,
    FiSearch
} from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { CONCRETE_GRADES, STEEL_GRADES, TIMBER_GRADES } from '../data/materialGrades'
import { PFC_SECTIONS, UKB_SECTIONS, UKC_SECTIONS } from '../data/steelSections'
import { cn } from '../lib/utils'

// ─── Tab definitions ────────────────────────────────────────────────────
type TabKey = 'steel' | 'concrete' | 'timber' | 'sections' | 'channels' | 'plates' | 'traffic' | 'wind' | 'thermal' | 'bearings' | 'joints'

const TAB_GROUPS = [
  {
    label: 'Materials', icon: <FiDatabase size={14} />,
    tabs: [
      { key: 'steel' as TabKey, label: 'Steel Grades' },
      { key: 'concrete' as TabKey, label: 'Concrete' },
      { key: 'timber' as TabKey, label: 'Timber' },
    ]
  },
  {
    label: 'Sections', icon: <FiGrid size={14} />,
    tabs: [
      { key: 'sections' as TabKey, label: 'UKB/UKC' },
      { key: 'channels' as TabKey, label: 'PFC/Channels' },
      { key: 'plates' as TabKey, label: 'Plates' },
    ]
  },
  {
    label: 'Load Models', icon: <FiLayers size={14} />,
    tabs: [
      { key: 'traffic' as TabKey, label: 'Traffic' },
      { key: 'wind' as TabKey, label: 'Wind' },
      { key: 'thermal' as TabKey, label: 'Thermal' },
    ]
  },
  {
    label: 'Components', icon: <FiBook size={14} />,
    tabs: [
      { key: 'bearings' as TabKey, label: 'Bearings' },
      { key: 'joints' as TabKey, label: 'Joints' },
    ]
  },
]

const pathMap: Record<string, TabKey> = {
  '/libraries': 'steel', '/libraries/steel': 'steel', '/libraries/concrete': 'concrete',
  '/libraries/timber': 'timber', '/libraries/sections': 'sections', '/libraries/channels': 'channels',
  '/libraries/plates': 'plates', '/libraries/traffic': 'traffic', '/libraries/wind': 'wind',
  '/libraries/thermal': 'thermal', '/libraries/bearings': 'bearings', '/libraries/joints': 'joints',
}
const tabPath: Record<TabKey, string> = {
  steel: '/libraries/steel', concrete: '/libraries/concrete', timber: '/libraries/timber',
  sections: '/libraries/sections', channels: '/libraries/channels', plates: '/libraries/plates',
  traffic: '/libraries/traffic', wind: '/libraries/wind', thermal: '/libraries/thermal',
  bearings: '/libraries/bearings', joints: '/libraries/joints',
}

// ── Derived data from shared libraries ──────────────────────────────────
const steelGrades = Object.values(STEEL_GRADES).map(s => ({
  grade: s.name, fy16: s.fy, fy40: s.fy_16_40, fy63: s.fy_40_63, fu: s.fu, E: s.E, standard: 'EN 10025-2',
}))
const concreteClasses = Object.values(CONCRETE_GRADES).map(c => ({
  cls: c.name, fck: c.fck, fcm: c.fcm, fctm: c.fctm, Ecm: c.Ecm, eps_cu: c.ecu2,
}))
const timberGrades = Object.values(TIMBER_GRADES).map(t => ({
  cls: t.name, type: t.type, fm: t.fm_k, ft: t.ft_0_k, fc: t.fc_0_k, fv: t.fv_k, E: t.E_mean, density: t.rho_k,
}))
const ukSections = [
  ...Object.values(UKB_SECTIONS).map(s => ({
    name: `UKB ${s.designation}`, h: s.h, b: s.b, tw: s.tw, tf: s.tf, mass: s.mass, Iy: s.Iy, Iz: s.Iz, Wply: s.Wpl_y, Wplz: s.Wpl_z,
  })),
  ...Object.values(UKC_SECTIONS).map(s => ({
    name: `UKC ${s.designation}`, h: s.h, b: s.b, tw: s.tw, tf: s.tf, mass: s.mass, Iy: s.Iy, Iz: s.Iz, Wply: s.Wpl_y, Wplz: s.Wpl_z,
  })),
]
const pfcSections = Object.values(PFC_SECTIONS).map(s => ({
  name: `PFC ${s.designation}`, h: s.h, b: s.b, tw: s.tw, tf: s.tf, mass: s.mass, Iy: s.Iy, Iz: s.Iz,
}))
const plateSizes = [
  { thickness: 6, widths: '1000, 1250, 1500, 2000, 2500', massPerM2: 47.1, standard: 'EN 10025' },
  { thickness: 8, widths: '1000, 1250, 1500, 2000, 2500', massPerM2: 62.8, standard: 'EN 10025' },
  { thickness: 10, widths: '1000, 1250, 1500, 2000, 2500, 3000', massPerM2: 78.5, standard: 'EN 10025' },
  { thickness: 12, widths: '1000, 1250, 1500, 2000, 2500, 3000', massPerM2: 94.2, standard: 'EN 10025' },
  { thickness: 15, widths: '1000, 1500, 2000, 2500, 3000', massPerM2: 117.8, standard: 'EN 10025' },
  { thickness: 20, widths: '1000, 1500, 2000, 2500, 3000', massPerM2: 157.0, standard: 'EN 10025' },
  { thickness: 25, widths: '1500, 2000, 2500, 3000', massPerM2: 196.3, standard: 'EN 10025' },
  { thickness: 30, widths: '1500, 2000, 2500, 3000', massPerM2: 235.5, standard: 'EN 10025' },
  { thickness: 40, widths: '1500, 2000, 2500, 3000', massPerM2: 314.0, standard: 'EN 10025' },
  { thickness: 50, widths: '2000, 2500, 3000', massPerM2: 392.5, standard: 'EN 10025' },
]
const trafficPresets = [
  { model: 'LM1 — Tandem + UDL', axle: '2 × 300 kN', udl: '9.0 kN/m²', lane: 'Lane 1', alpha: 'αQ1 = 1.0, αq1 = 0.61 (UK)', standard: 'EN 1991-2' },
  { model: 'LM1 — Lane 2', axle: '2 × 200 kN', udl: '2.5 kN/m²', lane: 'Lane 2', alpha: 'αQ2 = 1.0, αq2 = 2.2 (UK)', standard: 'EN 1991-2' },
  { model: 'LM1 — Lane 3+', axle: '2 × 100 kN', udl: '2.5 kN/m²', lane: 'Lane 3', alpha: 'αQi = 0, αqi = 2.2 (UK)', standard: 'EN 1991-2' },
  { model: 'LM2 — Single Axle', axle: '400 kN', udl: '—', lane: 'Any lane', alpha: 'βQ = 1.0 (UK)', standard: 'EN 1991-2' },
  { model: 'LM3 — SV80', axle: '80 t vehicle', udl: '—', lane: 'Notional', alpha: 'SV80 per BD 86/11', standard: 'CS 454' },
  { model: 'LM3 — SV100', axle: '100 t vehicle', udl: '—', lane: 'Notional', alpha: 'SV100 per BD 86/11', standard: 'CS 454' },
]
const windPresets = [
  { zone: 'Zone 1 (London)', vb: 21.5, cdir: 1.0, cseason: 1.0, calt: 1.0, terrain: 'Suburban', standard: 'EN 1991-1-4 (UK NA)' },
  { zone: 'Zone 2 (Midlands)', vb: 22.0, cdir: 1.0, cseason: 1.0, calt: 1.05, terrain: 'Open', standard: 'EN 1991-1-4 (UK NA)' },
  { zone: 'Zone 3 (North)', vb: 24.0, cdir: 1.0, cseason: 1.0, calt: 1.0, terrain: 'Open', standard: 'EN 1991-1-4 (UK NA)' },
  { zone: 'Zone 4 (Scotland)', vb: 26.0, cdir: 1.0, cseason: 1.0, calt: 1.1, terrain: 'Coastal', standard: 'EN 1991-1-4 (UK NA)' },
  { zone: 'Zone 5 (Exposed)', vb: 28.0, cdir: 1.0, cseason: 1.0, calt: 1.15, terrain: 'Coastal', standard: 'EN 1991-1-4 (UK NA)' },
]
const thermalPresets = [
  { type: 'Type 1 — Steel deck (surfaced)', Te_max: 58, Te_min: -18, dT_heat: 27, dT_cool: -13, standard: 'EN 1991-1-5 (UK NA)' },
  { type: 'Type 2 — Composite deck', Te_max: 48, Te_min: -18, dT_heat: 15, dT_cool: -18, standard: 'EN 1991-1-5 (UK NA)' },
  { type: 'Type 3 — Concrete deck', Te_max: 40, Te_min: -14, dT_heat: 15, dT_cool: -8, standard: 'EN 1991-1-5 (UK NA)' },
  { type: 'Type 3 — Concrete box', Te_max: 37, Te_min: -14, dT_heat: 10, dT_cool: -5, standard: 'EN 1991-1-5 (UK NA)' },
]
const bearingsCat = [
  { type: 'Elastomeric (Plain)', capacity: '500 kN', movement: '±25 mm', rotation: '0.02 rad', size: '200×250×42', supplier: 'Mageba/Ekspan' },
  { type: 'Elastomeric (Reinforced)', capacity: '2000 kN', movement: '±50 mm', rotation: '0.02 rad', size: '300×400×68', supplier: 'Mageba/Ekspan' },
  { type: 'Pot Bearing (Fixed)', capacity: '5000 kN', movement: 'None', rotation: '0.02 rad', size: 'Ø250', supplier: 'Maurer' },
  { type: 'Pot Bearing (Guided)', capacity: '5000 kN', movement: '±100 mm (uni)', rotation: '0.02 rad', size: 'Ø250', supplier: 'Maurer' },
  { type: 'Pot Bearing (Free)', capacity: '5000 kN', movement: '±100 mm (omni)', rotation: '0.02 rad', size: 'Ø250', supplier: 'Maurer' },
  { type: 'Spherical Bearing', capacity: '10000 kN', movement: '±200 mm', rotation: '0.05 rad', size: 'Ø400', supplier: 'Freyssinet' },
]
const jointsCat = [
  { type: 'Asphaltic Plug Joint', movement: '±20 mm', width: '500 mm', traffic: 'LM1', life: '20 years', supplier: 'Thorma' },
  { type: 'Nosing Joint', movement: '±40 mm', width: '100 mm', traffic: 'LM1', life: '25 years', supplier: 'Mageba' },
  { type: 'Single Seal (Maurer D80)', movement: '±80 mm', width: '150 mm', traffic: 'LM1+SV', life: '30 years', supplier: 'Maurer' },
  { type: 'Modular Joint (2-gap)', movement: '±160 mm', width: '300 mm', traffic: 'LM1+SV', life: '30 years', supplier: 'Mageba/Maurer' },
  { type: 'Modular Joint (4-gap)', movement: '±320 mm', width: '600 mm', traffic: 'LM1+SV', life: '30 years', supplier: 'Mageba/Maurer' },
]

// ─── Helpers ────────────────────────────────────────────────────────────
const DataTable = ({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) => (
  <Card className="bg-white/5 border-white/10">
    <CardContent className="p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">{headers.map(h => <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold uppercase whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              {row.map((cell, j) => <td key={j} className={`py-2.5 px-4 whitespace-nowrap ${j === 0 ? 'text-white font-bold' : 'text-gray-400 font-mono'}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent>
  </Card>
)

// ─── Main Component ─────────────────────────────────────────────────────
const Libraries: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab: TabKey = pathMap[location.pathname] || 'steel'
  const [search, setSearch] = useState('')

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-60 left-1/3 w-28 h-28 bg-teal-500/8 rounded-full blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">Libraries</span>
          </h1>
          <p className="text-gray-400 text-lg mb-6">Material properties, section catalogues, and load model reference data</p>

          {/* Grouped Tabs */}
          <div className="flex flex-wrap gap-6">
            {TAB_GROUPS.map(g => (
              <div key={g.label} className="flex items-center gap-1">
                <span className="text-xs text-gray-600 font-semibold mr-1 flex items-center gap-1">{g.icon} {g.label}:</span>
                {g.tabs.map(t => (
                  <button key={t.key} onClick={() => navigate(tabPath[t.key])}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      activeTab === t.key ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10')}
                  >{t.label}</button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Search */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`} className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500/50" />
          </div>
          <Button variant="ghost" className="border border-white/10 text-gray-400 hover:text-white text-sm"><FiDownload size={14} className="mr-2" /> Export CSV</Button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            {activeTab === 'steel' && <DataTable headers={['Grade','fy ≤16 (MPa)','fy ≤40 (MPa)','fy ≤63 (MPa)','fu (MPa)','E (MPa)','Standard']} rows={steelGrades.map(s => [s.grade, s.fy16, s.fy40, s.fy63, s.fu, s.E, s.standard])} />}
            {activeTab === 'concrete' && <DataTable headers={['Class','fck (MPa)','fcm (MPa)','fctm (MPa)','Ecm (GPa)','εcu (‰)']} rows={concreteClasses.map(c => [c.cls, c.fck, c.fcm, c.fctm, c.Ecm, c.eps_cu])} />}
            {activeTab === 'timber' && <DataTable headers={['Class','Type','fm,k (MPa)','ft,0,k (MPa)','fc,0,k (MPa)','fv,k (MPa)','E0,mean (MPa)','ρk (kg/m³)']} rows={timberGrades.map(t => [t.cls, t.type, t.fm, t.ft, t.fc, t.fv, t.E, t.density])} />}
            {activeTab === 'sections' && <DataTable headers={['Section','h (mm)','b (mm)','tw (mm)','tf (mm)','Mass (kg/m)','Iy (cm⁴)','Iz (cm⁴)','Wpl,y (cm³)','Wpl,z (cm³)']} rows={ukSections.map(s => [s.name, s.h, s.b, s.tw, s.tf, s.mass, s.Iy, s.Iz, s.Wply, s.Wplz])} />}
            {activeTab === 'channels' && <DataTable headers={['Section','h (mm)','b (mm)','tw (mm)','tf (mm)','Mass (kg/m)','Iy (cm⁴)','Iz (cm⁴)']} rows={pfcSections.map(s => [s.name, s.h, s.b, s.tw, s.tf, s.mass, s.Iy, s.Iz])} />}
            {activeTab === 'plates' && <DataTable headers={['Thickness (mm)','Available Widths (mm)','Mass (kg/m²)','Standard']} rows={plateSizes.map(p => [p.thickness, p.widths, p.massPerM2, p.standard])} />}
            {activeTab === 'traffic' && <DataTable headers={['Model','Axle Load','UDL','Lane','Adjustment Factors','Standard']} rows={trafficPresets.map(t => [t.model, t.axle, t.udl, t.lane, t.alpha, t.standard])} />}
            {activeTab === 'wind' && <DataTable headers={['Zone','vb,0 (m/s)','cdir','cseason','calt','Terrain','Standard']} rows={windPresets.map(w => [w.zone, w.vb, w.cdir, w.cseason, w.calt, w.terrain, w.standard])} />}
            {activeTab === 'thermal' && <DataTable headers={['Deck Type','Te,max (°C)','Te,min (°C)','ΔT Heat (°C)','ΔT Cool (°C)','Standard']} rows={thermalPresets.map(t => [t.type, t.Te_max, t.Te_min, t.dT_heat, t.dT_cool, t.standard])} />}
            {activeTab === 'bearings' && <DataTable headers={['Type','Capacity','Movement','Rotation','Size','Supplier']} rows={bearingsCat.map(b => [b.type, b.capacity, b.movement, b.rotation, b.size, b.supplier])} />}
            {activeTab === 'joints' && <DataTable headers={['Type','Movement','Gap Width','Traffic','Design Life','Supplier']} rows={jointsCat.map(j => [j.type, j.movement, j.width, j.traffic, j.life, j.supplier])} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Libraries
