import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import {
    FiBarChart2,
    FiChevronDown,
    FiGlobe,
    FiHelpCircle,
    FiMenu,
    FiMoon,
    FiSearch,
    FiSettings,
    FiStar,
    FiSun,
    FiX,
    FiZap
} from 'react-icons/fi'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { navigationStructure } from '../data/navigation'
import { useTheme } from '../lib/ThemeProvider'
import { cn } from '../lib/utils'
import GlobalSearch from './GlobalSearch'
import QuickCalcDrawer from './QuickCalcDrawer'

const FloatingNav: React.FC = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [isQuickCalcOpen, setIsQuickCalcOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [unitSystem, setUnitSystem] = useState<'UK' | 'EU'>('UK')
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  // Close dropdowns when route changes
  useEffect(() => {
    setActiveDropdown(null)
    setIsMobileMenuOpen(false)
  }, [location])

  // Handle scroll for navbar transparency
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        e.preventDefault()
        setIsQuickCalcOpen(!isQuickCalcOpen)
      }
      if (e.key === 'Escape') {
        setActiveDropdown(null)
        setIsSearchOpen(false)
        setIsQuickCalcOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isQuickCalcOpen])

  const primarySections = navigationStructure.slice(1, 8) // Bridges to Site Tools

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] }}
        className={cn(
          "fixed top-4 left-0 right-0 z-50 mx-auto w-[98%] max-w-[1600px] transition-all duration-300",
          isScrolled ? "top-2" : "top-4"
        )}
      >
        {/* Shimmering border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-neon-cyan/20 via-neon-purple/20 to-neon-blue/20 blur-xl opacity-50 animate-pulse" />
        
        <motion.div 
          className={cn(
            "relative floating-nav px-4 py-3.5 transition-all duration-300 w-full overflow-visible",
            isScrolled && "py-2.5 shadow-2xl shadow-neon-cyan/10"
          )}
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,30,0.95) 100%)',
          }}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 via-transparent to-neon-purple/10 animate-gradient-shift" />
          </div>
          
          <div className="relative flex items-center justify-between gap-2 w-full">
            {/* Logo - Using actual logo.png */}
            <Link to="/" className="flex-shrink-0">
              <motion.div 
                className="flex items-center space-x-3 group cursor-pointer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.img
                  src="/logo.png"
                  alt="BeaverCalc Studio"
                  className="h-10 w-auto"
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                />
                <div className="hidden xl:block">
                  <motion.div 
                    className="text-white font-black text-lg leading-tight group-hover:text-neon-cyan transition-colors"
                    whileHover={{ x: 2 }}
                  >
                    BeaverCalc
                  </motion.div>
                  <div className="text-[10px] text-gray-400 font-medium tracking-wider">STUDIO</div>
                </div>
              </motion.div>
            </Link>

            {/* Desktop Navigation - Centered */}
            <div className="hidden lg:flex items-center justify-center space-x-1 flex-1 min-w-0">
              {primarySections.map((section, index) => (
                <motion.div
                  key={section.title}
                  className="relative"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  onMouseEnter={() => setActiveDropdown(section.title)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <motion.button
                    className={cn(
                      "relative px-2.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200 group whitespace-nowrap",
                      activeDropdown === section.title 
                        ? "text-neon-cyan bg-white/10" 
                        : "text-gray-300 hover:text-white"
                    )}
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Magnetic hover effect background */}
                    {activeDropdown === section.title && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 rounded-lg border border-neon-cyan/30"
                        initial={false}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    
                    <span className="relative z-10 flex items-center space-x-1">
                      <span className="group-hover:drop-shadow-[0_0_8px_rgba(0,217,255,0.5)] transition-all duration-200">
                        {section.title}
                      </span>
                      <FiChevronDown 
                        className={cn(
                          "transition-transform duration-300",
                          activeDropdown === section.title && "rotate-180"
                        )} 
                        size={14}
                      />
                    </span>
                  </motion.button>

                  {/* Mega Menu Dropdown */}
                  <AnimatePresence>
                    {activeDropdown === section.title && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-[600px] rounded-2xl shadow-2xl p-6 backdrop-blur-2xl border border-white/20 z-[9999]"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0,0,0,0.98) 0%, rgba(20,20,30,0.98) 100%)',
                        }}
                      >
                        <div className="grid grid-cols-2 gap-6">
                          {section.categories.map((category) => (
                            <div key={category.label} className="space-y-3">
                              <div className="flex items-center space-x-2 text-neon-cyan font-bold text-sm">
                                <span className="text-lg">{category.icon}</span>
                                <span>{category.label}</span>
                              </div>
                              <div className="space-y-2">
                                {category.items.slice(0, 5).map((item) => (
                                  <Link
                                    key={item.path}
                                    to={item.path}
                                    className="block px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-white text-sm group-hover:text-neon-cyan transition-colors">
                                        {item.label}
                                      </span>
                                      {item.badge && (
                                        <span className={cn(
                                          "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                          item.badge === 'verified' && "bg-green-500/20 text-green-300",
                                          item.badge === 'beta' && "bg-yellow-500/20 text-yellow-300",
                                          item.badge === 'new' && "bg-blue-500/20 text-blue-300"
                                        )}>
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                    {item.description && (
                                      <p className="text-xs text-gray-400 mt-1">
                                        {item.description}
                                      </p>
                                    )}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Global Tools - Right aligned with equal spacing */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              {/* Search Button with glow effect */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSearchOpen(true)}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                title="Search (Ctrl+K)"
              >
                <motion.div
                  className="absolute inset-0 rounded-lg bg-neon-cyan/20 blur-md opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3 }}
                />
                <FiSearch className="relative z-10 text-gray-300 group-hover:text-neon-cyan transition-colors" size={18} />
                <motion.span 
                  className="absolute -top-1 -right-1 w-2 h-2 bg-neon-cyan rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.button>

              {/* Quick Calc Button with lightning effect */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsQuickCalcOpen(!isQuickCalcOpen)}
                className={cn(
                  "relative p-2 rounded-lg transition-all duration-200 group",
                  isQuickCalcOpen ? "bg-yellow-400/20 cyber-glow-yellow" : "hover:bg-white/10"
                )}
                title="Quick Calc (Ctrl+Q)"
              >
                <motion.div
                  className="absolute inset-0 rounded-lg bg-yellow-400/20 blur-md opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3 }}
                />
                <FiZap 
                  className={cn(
                    "relative z-10 transition-colors",
                    isQuickCalcOpen ? "text-yellow-400" : "text-gray-300 group-hover:text-yellow-400"
                  )} 
                  size={18} 
                />
                {isQuickCalcOpen && (
                  <motion.span 
                    className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </motion.button>

              {/* Favourites Button with star animation */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: [0, -15, 15, 0] }}
                whileTap={{ scale: 0.9 }}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                title="Favourites"
                onClick={() => navigate('/?favorites=true')}
              >
                <motion.div
                  className="absolute inset-0 rounded-lg bg-yellow-400/20 blur-md opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3 }}
                />
                <FiStar className="relative z-10 text-gray-300 group-hover:text-yellow-400 transition-colors" size={18} />
              </motion.button>

              {/* Compare Runs */}
              <Link to="/compare" title="Compare Runs">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                >
                  <FiBarChart2 className="text-gray-300 group-hover:text-emerald-400 transition-colors" size={18} />
                </motion.div>
              </Link>

              {/* Settings */}
              <Link to="/settings" title="Settings">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                >
                  <FiSettings className="text-gray-300 group-hover:text-neon-cyan transition-colors" size={18} />
                </motion.div>
              </Link>

              {/* Help */}
              <Link to="/help" title="Help & Documentation">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                >
                  <FiHelpCircle className="text-gray-300 group-hover:text-neon-purple transition-colors" size={18} />
                </motion.div>
              </Link>

              {/* Unit System Switcher with globe spin */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setUnitSystem(unitSystem === 'UK' ? 'EU' : 'UK')}
                className="relative px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 group flex items-center space-x-1.5"
                title="Toggle Unit System"
              >
                <motion.div
                  className="absolute inset-0 rounded-lg bg-neon-cyan/20 blur-md opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3 }}
                />
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="relative z-10"
                >
                  <FiGlobe className="text-gray-300 group-hover:text-neon-cyan transition-colors" size={18} />
                </motion.div>
                <span className="relative z-10 text-white text-sm font-bold tracking-wider">{unitSystem}</span>
              </motion.button>

              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleTheme()}
                className="relative px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <motion.div
                  className="absolute inset-0 rounded-lg bg-yellow-400/20 blur-md opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3 }}
                />
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10"
                >
                  {theme === 'dark' ? (
                    <FiSun className="text-gray-300 group-hover:text-yellow-400 transition-colors" size={18} />
                  ) : (
                    <FiMoon className="text-gray-600 group-hover:text-indigo-500 transition-colors" size={18} />
                  )}
                </motion.div>
              </motion.button>

              {/* Mobile Menu Toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              >
                {isMobileMenuOpen ? (
                  <FiX className="text-white" size={24} />
                ) : (
                  <FiMenu className="text-white" size={24} />
                )}
              </motion.button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:hidden mt-4 pt-4 border-t border-white/10 overflow-hidden"
              >
                <div className="space-y-2">
                  {primarySections.map((section) => (
                    <div key={section.title}>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === section.title ? null : section.title)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/10 transition-all duration-200"
                      >
                        <span className="text-white font-medium">{section.title}</span>
                        <FiChevronDown 
                          className={cn(
                            "transition-transform duration-200 text-gray-400",
                            activeDropdown === section.title && "rotate-180"
                          )} 
                          size={16} 
                        />
                      </button>
                      <AnimatePresence>
                        {activeDropdown === section.title && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pl-4 space-y-1 overflow-hidden"
                          >
                            {section.categories.map((category) => (
                              <div key={category.label} className="py-2">
                                <div className="text-xs text-neon-cyan font-bold mb-2 px-4">
                                  {category.icon} {category.label}
                                </div>
                                {category.items.slice(0, 3).map((item) => (
                                  <Link
                                    key={item.path}
                                    to={item.path}
                                    className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded transition-all duration-200"
                                  >
                                    {item.label}
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </motion.nav>
      
      {/* Modals */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <QuickCalcDrawer isOpen={isQuickCalcOpen} onClose={() => setIsQuickCalcOpen(false)} />
    </>
  )
}

export default FloatingNav
