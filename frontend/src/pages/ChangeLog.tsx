import { AnimatePresence, motion, useInView } from 'framer-motion'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    FiAlertCircle,
    FiAlertTriangle,
    FiArrowUp,
    FiBook,
    FiCalendar,
    FiChevronDown,
    FiClock,
    FiDownload,
    FiGitBranch,
    FiGitCommit,
    FiPackage,
    FiSearch,
    FiShield,
    FiTag,
    FiTrendingUp,
    FiZap
} from 'react-icons/fi'

// Extend jsPDF type
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface ChangeEntry {
  version: string
  date: string
  type: 'major' | 'minor' | 'patch'
  categories: {
    new?: string[]
    improved?: string[]
    fixed?: string[]
    deprecated?: string[]
    security?: string[]
  }
  breaking?: string[]
  contributors?: string[]
  notes?: string
}

const changeLog: ChangeEntry[] = [
  {
    version: '2.1.0',
    date: '2024-11-13',
    type: 'minor',
    categories: {
      new: [
        'Monte Carlo Sensitivity Analysis calculator with statistical analysis',
        'Tornado diagram visualization for parameter sensitivity ranking',
        'Three probability distributions: Uniform, Normal (Box-Muller), Triangular',
        'Real-time progress tracking for simulation runs',
        'Probability of failure calculations with 95th and 99th percentiles',
        'Correlation analysis between parameters and structural response'
      ],
      improved: [
        'Enhanced Steel Plate Girder calculator with comprehensive EN 1993-1-1 calculations',
        'Added section classification (Class 1-4) per Eurocode 3',
        'Implemented lateral-torsional buckling analysis with χLT reduction factors',
        'Added shear buckling verification per EN 1993-1-5',
        'Improved load combinations per EN 1990 (ULS: 1.35 DL + 1.5 LL)',
        'Enhanced bending-shear interaction checks per clause 6.2.8'
      ],
      fixed: [
        'Resolved jsPDF import errors in PDF export functionality',
        'Fixed routing issue for Sensitivity Analysis calculator',
        'Corrected component import statements in App.tsx',
        'Fixed CSS module type declarations'
      ]
    },
    contributors: ['Engineering Team', 'Development Team'],
    notes: 'Major update focusing on advanced structural analysis capabilities and professional-grade calculations.'
  },
  {
    version: '2.0.5',
    date: '2024-11-12',
    type: 'patch',
    categories: {
      new: [
        'Intelligent failure tooltips for all design checks',
        'Context-specific recommendations for failed structural checks',
        'PDF export with Beaver Bridges company branding',
        'Multi-page professional calculation reports'
      ],
      improved: [
        'Enhanced tooltip system with hover-triggered guidance',
        'Improved PDF layout with color-coded PASS/FAIL indicators',
        'Added company header and footer to all PDF exports',
        'Enhanced recommendation engine with 7 failure scenarios'
      ]
    },
    contributors: ['UX Team', 'Engineering Team']
  },
  {
    version: '2.0.0',
    date: '2024-11-10',
    type: 'major',
    categories: {
      new: [
        'Composite Beam calculator with shear stud design per EN 1994-1-1',
        'Elastomeric Bearings calculator with EN 1337 compliance',
        'Movement Joints calculator for bridge expansion joints',
        'Transverse Members calculator for bridge deck analysis',
        'Deck Slab calculator with wheel load distribution'
      ],
      improved: [
        'Migrated to React 18 with TypeScript for type safety',
        'Implemented Vite for faster development builds',
        'Added Tailwind CSS for consistent styling',
        'Enhanced UI with Framer Motion animations'
      ]
    },
    breaking: [
      'Minimum Node.js version updated to 18.0.0',
      'Changed API endpoint structure from /api/v1 to /api/v2',
      'Updated authentication flow to use JWT tokens'
    ],
    contributors: ['Core Development Team', 'Design Team'],
    notes: 'Complete platform modernization with breaking changes. Please review migration guide.'
  },
  {
    version: '1.8.2',
    date: '2024-10-28',
    type: 'patch',
    categories: {
      fixed: [
        'Fixed deflection calculation errors in Steel Beam Bending calculator',
        'Resolved unit conversion issues in Bearing Reactions',
        'Corrected web crippling checks in steel sections',
        'Fixed floating point precision in moment calculations'
      ],
      security: [
        'Updated Flask to 3.0.0 to address security vulnerabilities',
        'Patched SQLAlchemy SQL injection vulnerability',
        'Updated dependencies to latest secure versions'
      ]
    }
  },
  {
    version: '1.8.0',
    date: '2024-10-15',
    type: 'minor',
    categories: {
      new: [
        'Bracing calculator for lateral stability analysis',
        'Bearing Reactions calculator with multiple support types',
        'Track Mats calculator for temporary construction access',
        'Bog Mats calculator for soft ground conditions'
      ],
      improved: [
        'Enhanced calculation precision to 6 decimal places',
        'Improved error messages with actionable guidance',
        'Added dark mode theme throughout application',
        'Optimised calculation performance by 40%'
      ]
    },
    contributors: ['Engineering Team']
  },
  {
    version: '1.7.0',
    date: '2024-09-20',
    type: 'minor',
    categories: {
      new: [
        'Steel Plate Girder calculator (initial release)',
        'Material database with common steel grades',
        'Unit conversion system (SI/Imperial)',
        'Calculation history and project management'
      ],
      improved: [
        'Redesigned landing page with featured projects',
        'Added floating navigation for better UX',
        'Implemented toast notifications for user feedback',
        'Enhanced mobile responsiveness'
      ]
    }
  },
  {
    version: '1.6.0',
    date: '2024-08-15',
    type: 'minor',
    categories: {
      new: [
        'User authentication system with JWT',
        'Project save and load functionality',
        'Calculation templates library',
        'Export calculations to CSV format'
      ],
      improved: [
        'Database schema optimisation',
        'API response time improvements',
        'Enhanced error handling and logging'
      ]
    }
  },
  {
    version: '1.5.0',
    date: '2024-07-01',
    type: 'minor',
    categories: {
      new: [
        'Initial calculator framework',
        'Basic structural steel calculations',
        'Results visualization with charts',
        'PDF report generation (basic)'
      ]
    },
    notes: 'Foundation release with core calculation engine.'
  }
]

const ChangeLog: React.FC = () => {
  const [selectedType, setSelectedType] = useState<'all' | 'major' | 'minor' | 'patch'>('all')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'new' | 'improved' | 'fixed' | 'security'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set(changeLog.map(c => c.version)))
  const timelineRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const isHeroInView = useInView(heroRef, { once: true })
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getCategoryIcon = (category: string, size = 14) => {
    switch (category) {
      case 'new': return <FiPackage size={size} className="text-cyan-400" />
      case 'improved': return <FiZap size={size} className="text-emerald-400" />
      case 'fixed': return <FiAlertCircle size={size} className="text-amber-400" />
      case 'deprecated': return <FiAlertTriangle size={size} className="text-yellow-400" />
      case 'security': return <FiShield size={size} className="text-red-400" />
      default: return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'new': return 'border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40'
      case 'improved': return 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
      case 'fixed': return 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40'
      case 'deprecated': return 'border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/40'
      case 'security': return 'border-red-500/20 bg-red-500/5 hover:border-red-500/40'
      default: return 'border-gray-500/20 bg-gray-500/5'
    }
  }

  const getVersionBadgeColor = (type: string) => {
    switch (type) {
      case 'major': return 'bg-red-500/15 text-red-400 border-red-500/30 shadow-red-500/10'
      case 'minor': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-cyan-500/10'
      case 'patch': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10'
      default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30'
    }
  }

  const getVersionDotColor = (type: string) => {
    switch (type) {
      case 'major': return 'bg-red-500 shadow-red-500/50'
      case 'minor': return 'bg-cyan-500 shadow-cyan-500/50'
      case 'patch': return 'bg-emerald-500 shadow-emerald-500/50'
      default: return 'bg-gray-500'
    }
  }

  const filteredChanges = useMemo(() => changeLog.filter(change => {
    if (selectedType !== 'all' && change.type !== selectedType) return false
    
    if (selectedCategory !== 'all') {
      const hasCategory = Object.keys(change.categories).some(cat => {
        if (cat === selectedCategory) {
          const items = change.categories[cat as keyof typeof change.categories]
          return items && items.length > 0
        }
        return false
      })
      if (!hasCategory) return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const inVersion = change.version.includes(q)
      const inNotes = change.notes?.toLowerCase().includes(q)
      const inItems = Object.values(change.categories).some(items =>
        items?.some(item => item.toLowerCase().includes(q))
      )
      const inBreaking = change.breaking?.some(b => b.toLowerCase().includes(q))
      if (!inVersion && !inNotes && !inItems && !inBreaking) return false
    }
    
    return true
  }), [selectedType, selectedCategory, searchQuery])

  const exportToPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Header
    doc.setFillColor(0, 217, 255)
    doc.rect(0, 0, pageWidth, 30, 'F')
    doc.setTextColor(10, 10, 15)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('BEAVER BRIDGES', pageWidth / 2, 15, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Structural Engineering Calculator - Change Log', pageWidth / 2, 23, { align: 'center' })

    let yPosition = 45

    filteredChanges.forEach((change, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage()
        yPosition = 20
      }

      // Version Header
      doc.setFillColor(30, 30, 40)
      doc.rect(14, yPosition - 5, pageWidth - 28, 12, 'F')
      doc.setTextColor(0, 217, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`Version ${change.version}`, 20, yPosition + 3)
      
      doc.setTextColor(180, 180, 180)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(change.date, pageWidth - 20, yPosition + 3, { align: 'right' })
      
      yPosition += 15

      // Type Badge
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Type: ${change.type.toUpperCase()}`, 20, yPosition)
      yPosition += 8

      // Categories
      Object.entries(change.categories).forEach(([category, items]) => {
        if (items && items.length > 0) {
          // Check page break
          if (yPosition > pageHeight - 50) {
            doc.addPage()
            yPosition = 20
          }

          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 217, 255)
          doc.text(category.charAt(0).toUpperCase() + category.slice(1), 20, yPosition)
          yPosition += 6

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(200, 200, 200)

          items.forEach(item => {
            // Word wrap for long items
            const splitText = doc.splitTextToSize(`• ${item}`, pageWidth - 45)
            splitText.forEach((line: string) => {
              if (yPosition > pageHeight - 30) {
                doc.addPage()
                yPosition = 20
              }
              doc.text(line, 25, yPosition)
              yPosition += 5
            })
          })

          yPosition += 5
        }
      })

      // Breaking Changes
      if (change.breaking && change.breaking.length > 0) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 100, 100)
        doc.text('⚠ Breaking Changes', 20, yPosition)
        yPosition += 6

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(200, 200, 200)

        change.breaking.forEach(item => {
          const splitText = doc.splitTextToSize(`• ${item}`, pageWidth - 45)
          splitText.forEach((line: string) => {
            if (yPosition > pageHeight - 30) {
              doc.addPage()
              yPosition = 20
            }
            doc.text(line, 25, yPosition)
            yPosition += 5
          })
        })
        yPosition += 5
      }

      // Notes
      if (change.notes) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        const splitNotes = doc.splitTextToSize(`Note: ${change.notes}`, pageWidth - 45)
        splitNotes.forEach((line: string) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 20, yPosition)
          yPosition += 5
        })
        yPosition += 5
      }

      // Contributors
      if (change.contributors && change.contributors.length > 0) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 120)
        doc.text(`Contributors: ${change.contributors.join(', ')}`, 20, yPosition)
        yPosition += 8
      }

      // Separator
      if (index < filteredChanges.length - 1) {
        doc.setDrawColor(60, 60, 70)
        doc.line(20, yPosition, pageWidth - 20, yPosition)
        yPosition += 12
      }
    })

    // Footer on all pages
    const totalPages = doc.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFillColor(30, 30, 40)
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F')
      doc.setTextColor(180, 180, 180)
      doc.setFontSize(9)
      doc.text(
        'Beaver Bridges Ltd | Structural Engineering Solutions | www.beaverbridges.com',
        pageWidth / 2,
        pageHeight - 7,
        { align: 'center' }
      )
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 7, { align: 'right' })
    }

    doc.save('structural-calculator-changelog.pdf')
  }

  const getStatistics = () => {
    const stats = {
      totalVersions: changeLog.length,
      newFeatures: 0,
      improvements: 0,
      bugFixes: 0,
      securityPatches: 0
    }

    changeLog.forEach(change => {
      stats.newFeatures += change.categories.new?.length || 0
      stats.improvements += change.categories.improved?.length || 0
      stats.bugFixes += change.categories.fixed?.length || 0
      stats.securityPatches += change.categories.security?.length || 0
    })

    return stats
  }

  const stats = getStatistics()

  const totalChanges = stats.newFeatures + stats.improvements + stats.bugFixes + stats.securityPatches
  const latestVersion = changeLog[0]

  const toggleVersion = (v: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  const scrollToVersion = (version: string) => {
    document.getElementById(`version-${version}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* ── Animated Counter ─────────────────────────────────────────────────── */
  function AnimatedCount({ value, duration = 1.5, delay = 0 }: { value: number; duration?: number; delay?: number }) {
    const [display, setDisplay] = useState(0)
    const ref = useRef<HTMLSpanElement>(null)
    const inView = useInView(ref, { once: true })
    useEffect(() => {
      if (!inView) return
      const start = performance.now()
      const step = (now: number) => {
        const elapsed = Math.max(0, now - start - delay * 1000)
        const progress = Math.min(elapsed / (duration * 1000), 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplay(Math.round(eased * value))
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, [inView, value, duration, delay])
    return <span ref={ref}>{display}</span>
  }

  /* ── Category label map ─────────────────────────────────────────────── */
  const categoryLabels: Record<string, string> = {
    new: 'New Features',
    improved: 'Improvements',
    fixed: 'Bug Fixes',
    deprecated: 'Deprecated',
    security: 'Security',
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* ── Decorative Background ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-1/5 w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-1/3 w-[400px] h-[400px] bg-indigo-500/[0.02] rounded-full blur-[100px]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #00d9ff 0.5px, transparent 0.5px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10 py-24 px-4">
        <div className="max-w-6xl mx-auto">

          {/* ════════════════════════════════════════════════════════════════
              HERO HEADER
              ════════════════════════════════════════════════════════════ */}
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            {/* Top badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 mb-8"
            >
              <FiGitCommit className="text-cyan-400" size={14} />
              <span className="text-cyan-400 text-sm font-semibold tracking-wide">Version History</span>
              <span className="text-gray-500 text-xs">•</span>
              <span className="text-gray-400 text-xs">{changeLog.length} releases</span>
            </motion.div>

            {/* Title */}
            <h1 className="text-6xl md:text-7xl font-black mb-6 leading-[1.05]">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 text-transparent bg-clip-text">
                Change Log
              </span>
            </h1>

            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-4 leading-relaxed">
              Every feature, improvement, and fix — meticulously documented.
            </p>
            <p className="text-gray-600 text-sm max-w-xl mx-auto mb-12">
              Structural engineering software you can trust. Full transparency on every change.
            </p>

            {/* ── Statistics Row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 max-w-5xl mx-auto mb-10">
              {[
                { icon: <FiTag size={18} />, val: stats.totalVersions, label: 'Releases', color: 'cyan', delay: 0 },
                { icon: <FiPackage size={18} />, val: stats.newFeatures, label: 'Features', color: 'cyan', delay: 0.05 },
                { icon: <FiZap size={18} />, val: stats.improvements, label: 'Improvements', color: 'emerald', delay: 0.1 },
                { icon: <FiAlertCircle size={18} />, val: stats.bugFixes, label: 'Bug Fixes', color: 'amber', delay: 0.15 },
                { icon: <FiShield size={18} />, val: stats.securityPatches, label: 'Security', color: 'red', delay: 0.2 },
                { icon: <FiTrendingUp size={18} />, val: totalChanges, label: 'Total Changes', color: 'blue', delay: 0.25 },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + s.delay }}
                  className={`relative group p-4 rounded-xl border border-${s.color}-500/15 bg-gradient-to-br from-${s.color}-500/[0.04] to-transparent backdrop-blur-sm hover:border-${s.color}-500/30 transition-all duration-300`}
                >
                  <div className={`text-${s.color}-400 mb-2 flex justify-center opacity-60 group-hover:opacity-100 transition-opacity`}>
                    {s.icon}
                  </div>
                  <div className="text-2xl font-black text-white">
                    <AnimatedCount value={s.val} delay={0.3 + s.delay} />
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* ── Version Quick-Nav Pills ── */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {changeLog.map((c, i) => (
                <button
                  key={c.version}
                  onClick={() => scrollToVersion(c.version)}
                  className={`group relative px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 border ${
                    i === 0
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                      : 'border-gray-700/40 bg-gray-800/30 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  v{c.version}
                  {i === 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 uppercase tracking-wider">
                      latest
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Search + Filters + Export ── */}
            <div className="flex flex-col gap-4 bg-gray-800/20 backdrop-blur-md p-5 rounded-2xl border border-gray-700/30 max-w-5xl mx-auto">
              {/* Search bar */}
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search versions, features, fixes..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-900/60 border border-gray-700/40 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                  >
                    clear
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                {/* Type pills */}
                <div className="flex flex-wrap gap-2">
                  {(['all', 'major', 'minor', 'patch'] as const).map((type) => {
                    const colors: Record<string, string> = {
                      all: 'cyan',
                      major: 'red',
                      minor: 'cyan',
                      patch: 'emerald',
                    }
                    const c = colors[type]
                    const active = selectedType === type
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                          active
                            ? `bg-${c}-500/15 border-${c}-500/40 text-${c}-400 shadow-sm shadow-${c}-500/10`
                            : 'bg-gray-800/40 border-gray-700/30 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    )
                  })}

                  <div className="w-px h-6 bg-gray-700/40 mx-1 self-center hidden sm:block" />

                  {/* Category pills */}
                  {(['all', 'new', 'improved', 'fixed', 'security'] as const).map((cat) => {
                    const active = selectedCategory === cat
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 ${
                          active
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                            : 'bg-gray-800/40 border-gray-700/30 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {cat !== 'all' && getCategoryIcon(cat, 11)}
                        {cat === 'all' ? 'All' : categoryLabels[cat]}
                      </button>
                    )
                  })}
                </div>

                {/* Export */}
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-95 whitespace-nowrap"
                >
                  <FiDownload size={14} />
                  Export PDF
                </button>
              </div>

              {/* Active filter summary */}
              {(selectedType !== 'all' || selectedCategory !== 'all' || searchQuery) && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Showing {filteredChanges.length} of {changeLog.length} releases</span>
                  <button
                    onClick={() => { setSelectedType('all'); setSelectedCategory('all'); setSearchQuery('') }}
                    className="text-cyan-500 hover:text-cyan-400 underline underline-offset-2"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════════════════════════
              TIMELINE
              ════════════════════════════════════════════════════════════ */}
          <div ref={timelineRef} className="relative">
            {/* Vertical gradient line */}
            <div className="absolute left-[23px] md:left-8 top-0 bottom-0 w-px">
              <div className="h-full bg-gradient-to-b from-cyan-500/60 via-blue-500/40 to-indigo-500/20" />
            </div>

            <div className="space-y-8">
              <AnimatePresence mode="popLayout">
                {filteredChanges.map((change, index) => {
                  const isExpanded = expandedVersions.has(change.version)
                  const isLatest = change.version === latestVersion.version

                  return (
                    <TimelineEntry
                      key={change.version}
                      change={change}
                      index={index}
                      isLatest={isLatest}
                      isExpanded={isExpanded}
                      onToggle={() => toggleVersion(change.version)}
                      getVersionBadgeColor={getVersionBadgeColor}
                      getVersionDotColor={getVersionDotColor}
                      getCategoryColor={getCategoryColor}
                      getCategoryIcon={getCategoryIcon}
                      categoryLabels={categoryLabels}
                      searchQuery={searchQuery}
                    />
                  )
                })}
              </AnimatePresence>
            </div>

            {/* No results */}
            {filteredChanges.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="text-5xl mb-4">🔍</div>
                <div className="text-gray-400 text-lg font-medium mb-2">No releases match your filters</div>
                <div className="text-gray-600 text-sm mb-4">Try adjusting your search or filter criteria</div>
                <button
                  onClick={() => { setSelectedType('all'); setSelectedCategory('all'); setSearchQuery('') }}
                  className="px-5 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-all"
                >
                  Reset Filters
                </button>
              </motion.div>
            )}
          </div>

          {/* ── Footer ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-20 pt-10 border-t border-gray-800/50"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <FiClock size={14} />
                  <span className="text-sm">Latest release: v{latestVersion.version} • {latestVersion.date}</span>
                </div>
                <p className="text-gray-600 text-xs">
                  Maintained by Beaver Bridges Ltd — engineering@beaverbridges.com
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-red-500/60" /> Major
                  <div className="w-2 h-2 rounded-full bg-cyan-500/60 ml-2" /> Minor
                  <div className="w-2 h-2 rounded-full bg-emerald-500/60 ml-2" /> Patch
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Scroll-to-top ── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-50 p-3 rounded-xl bg-gray-800/80 border border-gray-700/50 text-gray-400 hover:text-white hover:border-cyan-500/40 backdrop-blur-md shadow-xl transition-all duration-200"
          >
            <FiArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TIMELINE ENTRY COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
function TimelineEntry({
  change,
  index,
  isLatest,
  isExpanded,
  onToggle,
  getVersionBadgeColor,
  getVersionDotColor,
  getCategoryColor,
  getCategoryIcon,
  categoryLabels,
  searchQuery,
}: {
  change: ChangeEntry
  index: number
  isLatest: boolean
  isExpanded: boolean
  onToggle: () => void
  getVersionBadgeColor: (type: string) => string
  getVersionDotColor: (type: string) => string
  getCategoryColor: (cat: string) => string
  getCategoryIcon: (cat: string, size?: number) => React.ReactNode
  categoryLabels: Record<string, string>
  searchQuery: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  const totalItems = Object.values(change.categories).reduce(
    (sum, items) => sum + (items?.length || 0),
    0
  )

  // Highlight matching text
  const highlight = (text: string) => {
    if (!searchQuery.trim()) return text
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-cyan-500/20 text-cyan-300 rounded px-0.5">{part}</mark>
        : part
    )
  }

  return (
    <motion.div
      ref={ref}
      id={`version-${change.version}`}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.4 }}
      className="relative pl-14 md:pl-20 scroll-mt-24"
    >
      {/* Timeline dot */}
      <div className={`absolute left-[17px] md:left-[25px] top-7 w-[13px] h-[13px] rounded-full border-[3px] border-[#0a0a0f] shadow-lg ${getVersionDotColor(change.type)} ${isLatest ? 'ring-2 ring-cyan-400/30 ring-offset-2 ring-offset-[#0a0a0f]' : ''}`} />

      {/* Card */}
      <div
        className={`group relative rounded-2xl border transition-all duration-300 ${
          isLatest
            ? 'border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.04] via-gray-900/60 to-gray-900/40 shadow-lg shadow-cyan-500/5'
            : 'border-gray-700/30 bg-gradient-to-br from-gray-800/30 to-gray-900/30 hover:border-gray-600/40'
        } backdrop-blur-sm`}
      >
        {/* Latest ribbon */}
        {isLatest && (
          <div className="absolute -top-px -right-px">
            <div className="px-3 py-1 rounded-bl-lg rounded-tr-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-[10px] font-bold text-white uppercase tracking-wider">
              Latest
            </div>
          </div>
        )}

        {/* Header — always visible, clickable to toggle */}
        <button
          onClick={onToggle}
          className="w-full text-left p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-3 md:gap-4"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Version number */}
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight whitespace-nowrap">
              v{change.version}
            </h2>
            {/* Type badge */}
            <span className={`px-3 py-1 rounded-lg text-[11px] font-bold border uppercase tracking-wider shadow-sm ${getVersionBadgeColor(change.type)}`}>
              {change.type}
            </span>
            {/* Compact category chips */}
            <div className="hidden md:flex items-center gap-1.5 ml-2">
              {Object.entries(change.categories).map(([cat, items]) =>
                items && items.length > 0 ? (
                  <span key={cat} className="flex items-center gap-0.5 text-[10px] text-gray-500">
                    {getCategoryIcon(cat, 10)}
                    <span>{items.length}</span>
                  </span>
                ) : null
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <FiCalendar size={13} />
              {new Date(change.date).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <FiGitCommit size={13} />
              <span className="text-xs">{totalItems} changes</span>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <FiChevronDown size={18} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
            </motion.div>
          </div>
        </button>

        {/* Expandable body */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-6 md:px-8 pb-6 md:pb-8 space-y-5">
                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-700/40 to-transparent" />

                {/* Breaking Changes */}
                {change.breaking && change.breaking.length > 0 && (
                  <div className="p-4 bg-red-500/[0.06] border border-red-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <FiAlertTriangle className="text-red-400" size={16} />
                      <h3 className="text-red-400 font-bold text-sm">Breaking Changes</h3>
                    </div>
                    <ul className="space-y-2">
                      {change.breaking.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-red-400 mt-0.5 text-xs">⚠</span>
                          <span>{highlight(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Categories */}
                <div className="grid gap-4">
                  {Object.entries(change.categories).map(([category, items]) => {
                    if (!items || items.length === 0) return null
                    return (
                      <div
                        key={category}
                        className={`p-4 md:p-5 rounded-xl border transition-colors duration-200 ${getCategoryColor(category)}`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          {getCategoryIcon(category)}
                          <h3 className="text-white font-bold text-sm">
                            {categoryLabels[category] || category}
                          </h3>
                          <span className="ml-auto text-[11px] text-gray-600 font-mono">
                            {items.length}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {items.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-300 leading-relaxed">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
                              <span>{highlight(item)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>

                {/* Notes */}
                {change.notes && (
                  <div className="flex items-start gap-3 p-4 bg-blue-500/[0.04] border border-blue-500/15 rounded-xl">
                    <FiBook className="text-blue-400 mt-0.5 flex-shrink-0" size={14} />
                    <p className="text-gray-400 text-sm italic leading-relaxed">{highlight(change.notes)}</p>
                  </div>
                )}

                {/* Contributors */}
                {change.contributors && change.contributors.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 text-xs text-gray-600">
                    <FiGitBranch size={12} />
                    <span>Contributors:</span>
                    <span className="text-gray-400">
                      {change.contributors.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default ChangeLog
