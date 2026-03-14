import { type Variants, motion, useAnimation, useInView } from 'framer-motion'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiArrowRight, FiChevronDown } from 'react-icons/fi'
import { Link } from 'react-router-dom'

/* ──────────────────────────────────────────────────────────────────────────
   Engineering blueprint grid — subtle SVG background
   ────────────────────────────────────────────────────────────────────────── */
const BlueprintGrid: React.FC = React.memo(() => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid-sm" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00D9FF" strokeWidth="0.3" />
      </pattern>
      <pattern id="grid-lg" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="url(#grid-sm)" />
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#00D9FF" strokeWidth="0.8" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-lg)" />
  </svg>
))

/* ──────────────────────────────────────────────────────────────────────────
   Animated counter — rolls up to target on scroll into view
   ────────────────────────────────────────────────────────────────────────── */
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref as React.RefObject<Element>, { once: true })

  useEffect(() => {
    if (!inView) return
    let frame: number
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [end, duration, inView])

  return { count, ref }
}

const StatBlock: React.FC<{ value: number; suffix: string; label: string; delay: number }> = ({
  value, suffix, label, delay,
}) => {
  const { count, ref } = useCounter(value)
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="text-center group"
    >
      <span ref={ref} className="block text-5xl md:text-6xl font-black text-white tracking-tight tabular-nums">
        {count}<span className="text-[#00D9FF]">{suffix}</span>
      </span>
      <span className="block mt-2 text-sm text-gray-400 uppercase tracking-[0.2em] font-semibold group-hover:text-gray-300 transition-colors">
        {label}
      </span>
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   HERO COMPONENT
   ────────────────────────────────────────────────────────────────────────── */
interface HeroProps {
  title?: string
  subtitle?: string
  showCTA?: boolean
}

export const Hero: React.FC<HeroProps> = ({
  title = "Engineer with Precision",
  subtitle = "Professional structural calculations with real-time verification to EN standards",
  showCTA = true,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef as React.RefObject<Element>, { once: true })
  const controls = useAnimation()
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  useEffect(() => {
    if (isInView) controls.start('visible')
  }, [isInView, controls])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }, [])

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
  }
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  }
  const wordPop: Variants = {
    hidden: { opacity: 0, y: 40, rotateX: -45 },
    visible: (i: number) => ({
      opacity: 1, y: 0, rotateX: 0,
      transition: { delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    }),
  }

  const words = title.split(' ')

  const capabilities = useMemo(() => [
    { icon: '🌉', text: 'Bridge Design', code: 'EN 1993-2' },
    { icon: '🏗️', text: 'Temporary Works', code: 'BS 5975' },
    { icon: '⚙️', text: 'Steel & Concrete', code: 'EN 1993 / 1992' },
    { icon: '🪨', text: 'Geotechnics', code: 'EN 1997-1' },
    { icon: '📐', text: 'Eurocode Compliant', code: 'UK NA' },
  ], [])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* ── BACKGROUND LAYERS ────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[#0c0e1a]" />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #262C53 0%, #0c0e1a 70%)',
        }}
      />
      <BlueprintGrid />

      {/* Mouse-follow spotlight */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle 700px at ${mousePos.x}% ${mousePos.y}%, rgba(0,217,255,0.06) 0%, transparent 60%)`,
        }}
      />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00D9FF]/40 to-transparent" />

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 w-full max-w-6xl mx-auto px-6 text-center pt-32 pb-20"
        variants={container}
        initial="hidden"
        animate={controls}
      >
        {/* Company badge */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <img src="/logo.png" alt="" className="h-6 w-auto" />
            <div className="w-px h-4 bg-white/20" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">
              Beaver Bridges Engineering
            </span>
          </div>
        </motion.div>

        {/* Animated headline */}
        <div className="mb-6" style={{ perspective: '1000px' }}>
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase leading-[0.9] tracking-tight">
            {words.map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.25em] font-zentry"
                custom={i}
                variants={wordPop}
                style={{
                  color: i === words.length - 1 ? '#00D9FF' : '#ffffff',
                  textShadow: i === words.length - 1 ? '0 0 40px rgba(0,217,255,0.3)' : 'none',
                }}
              >
                {word}
              </motion.span>
            ))}
          </h1>
        </div>

        {/* Accent divider */}
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#00D9FF]/60" />
          <div className="w-2 h-2 rounded-full bg-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.6)]" />
          <div className="w-20 h-px bg-[#00D9FF]/40" />
          <div className="w-2 h-2 rounded-full bg-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.6)]" />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#00D9FF]/60" />
        </motion.div>

        {/* Sub-headline */}
        <motion.p
          variants={fadeUp}
          className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-12 font-light"
        >
          {subtitle}
        </motion.p>

        {/* Capability pills */}
        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 mb-14">
          {capabilities.map((cap, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:border-[#00D9FF]/30 hover:bg-[#00D9FF]/[0.05] transition-all duration-300 cursor-default"
            >
              <span className="text-lg">{cap.icon}</span>
              <span className="text-sm font-semibold text-white">{cap.text}</span>
              <span className="text-[10px] font-mono text-[#00D9FF]/70 hidden sm:inline">{cap.code}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA buttons */}
        {showCTA && (
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link to="/#calculators">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="group relative px-8 py-4 rounded-xl font-bold text-base text-[#0c0e1a] bg-[#00D9FF] overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(0,217,255,0.35)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  View Calculators
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-[#00D9FF] to-[#06FFA5] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
            </Link>
            <Link to="/projects">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 rounded-xl font-bold text-base text-white border border-white/15 bg-white/[0.04] backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.08] transition-all duration-300"
              >
                View Projects
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 max-w-4xl mx-auto py-10 border-t border-white/[0.06]">
          <StatBlock value={81} suffix="+" label="Calculators" delay={0} />
          <StatBlock value={100} suffix="%" label="EN Compliant" delay={0.1} />
          <StatBlock value={12} suffix="" label="Categories" delay={0.2} />
          <StatBlock value={500} suffix="+" label="Projects Run" delay={0.3} />
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500"
      >
        <span className="text-[10px] uppercase tracking-[0.25em] font-semibold">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <FiChevronDown size={16} />
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0c0e1a] to-transparent pointer-events-none" />
    </section>
  )
}

export default Hero
