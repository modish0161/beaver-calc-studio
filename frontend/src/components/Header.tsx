import clsx from 'clsx'
import gsap from 'gsap'
import React, { useEffect, useRef, useState } from 'react'
import { FiGlobe, FiSearch, FiStar, FiZap } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import { useWindowScroll } from 'react-use'
import { navigationStructure } from '../data/navigation'
import BeaverButton from './BeaverButton'
import FavouritesModal from './FavouritesModal'
import GlobalSearch from './GlobalSearch'
import QuickCalcDrawer from './QuickCalcDrawer'

const Header: React.FC = () => {
  const [isIndicatorActive, setIsIndicatorActive] = useState(false)
  const [isNavVisible, setIsNavVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [isQuickCalcOpen, setIsQuickCalcOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isFavouritesOpen, setIsFavouritesOpen] = useState(false)
  const [unitSystem, setUnitSystem] = useState<'UK' | 'EU'>('UK')
  const [favCount, setFavCount] = useState(0)
  const navigate = useNavigate()

  // Sync favourites count from localStorage
  useEffect(() => {
    const updateCount = () => {
      try {
        const saved = localStorage.getItem('calculatorFavorites')
        setFavCount(saved ? JSON.parse(saved).length : 0)
      } catch { setFavCount(0) }
    }
    updateCount()
    window.addEventListener('storage', updateCount)
    // Also poll for same-tab changes
    const interval = setInterval(updateCount, 2000)
    return () => { window.removeEventListener('storage', updateCount); clearInterval(interval) }
  }, [])
  
  const navContainerRef = useRef<HTMLDivElement>(null)
  const { y: currentScrollY } = useWindowScroll()

  const toggleIndicator = () => {
    setIsIndicatorActive((prev) => !prev)
  }

  // Scroll-based NavBar show/hide logic
  useEffect(() => {
    if (currentScrollY === 0) {
      setIsNavVisible(true)
      navContainerRef.current?.classList.remove('floating-nav')
    } else if (currentScrollY > lastScrollY) {
      setIsNavVisible(false)
      navContainerRef.current?.classList.add('floating-nav')
    } else if (currentScrollY < lastScrollY) {
      setIsNavVisible(true)
      navContainerRef.current?.classList.add('floating-nav')
    }
    setLastScrollY(currentScrollY)
  }, [currentScrollY, lastScrollY])

  // Animate NavBar transition
  useEffect(() => {
    gsap.to(navContainerRef.current, {
      y: isNavVisible ? 0 : -100,
      opacity: isNavVisible ? 1 : 0,
      duration: 0.2,
    })
  }, [isNavVisible])

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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isQuickCalcOpen])

  // Get primary sections for top-level nav (first 7)
  const primarySections = navigationStructure.slice(0, 7)

  return (
    <>
      <div
        ref={navContainerRef}
        className="fixed inset-x-0 z-50 transition-all duration-700 border-none top-4 sm:inset-x-6"
      >
        <header className="absolute w-full -translate-y-1/2 top-1/2">
          <nav className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-md rounded-lg border border-white/10">
            {/* Left Section: Logo and Nav */}
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Beaver Bridges Logo"
                className="w-[80px] cursor-pointer"
                onClick={() => navigate('/')}
              />

              <div className="hidden xl:flex items-center gap-1">
                {primarySections.map((section) => (
                  <div
                    key={section.title}
                    className="relative"
                    onMouseEnter={() => setActiveDropdown(section.title)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <Link
                      to={section.path}
                      className="nav-hover-btn text-xs px-3 py-2"
                    >
                      {section.icon} {section.title}
                    </Link>

                    {/* Mega Menu Dropdown */}
                    {activeDropdown === section.title && (
                      <div className="absolute top-full left-0 mt-2 w-[600px] bg-black/95 backdrop-blur-xl rounded-lg border border-white/20 shadow-2xl p-6 z-50">
                        <div className="grid grid-cols-2 gap-6">
                          {section.categories.map((category) => (
                            <div key={category.label} className="space-y-2">
                              <h3 className="text-sm font-bold text-blue-50 flex items-center gap-2">
                                <span>{category.icon}</span>
                                {category.label}
                              </h3>
                              <ul className="space-y-1">
                                {category.items.map((item) => (
                                  <li key={item.path}>
                                    <Link
                                      to={item.path}
                                      className="text-xs text-gray-300 hover:text-blue-100 transition-colors flex items-center justify-between group"
                                    >
                                      <span className="group-hover:translate-x-1 transition-transform">
                                        {item.label}
                                      </span>
                                      {item.badge && (
                                        <span className={clsx(
                                          'text-[10px] px-2 py-0.5 rounded-full',
                                          item.badge === 'verified' && 'bg-green-500/20 text-green-300',
                                          item.badge === 'beta' && 'bg-yellow-500/20 text-yellow-300',
                                          item.badge === 'new' && 'bg-blue-500/20 text-blue-300'
                                        )}>
                                          {item.badge}
                                        </span>
                                      )}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-xs text-gray-400">{section.description}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Section: Tools + CTA + Indicator */}
            <div className="flex items-center gap-3">
              {/* Global Search */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-xs text-gray-300"
                title="Search (Ctrl+K)"
              >
                <FiSearch />
                <span className="hidden lg:inline">Search</span>
                <span className="text-[10px] text-gray-500">⌘K</span>
              </button>

              {/* Quick Calc */}
              <button
                onClick={() => setIsQuickCalcOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-xs text-gray-300"
                title="Quick Calc (Ctrl+Q)"
              >
                <FiZap className="text-yellow-400" />
                <span className="hidden lg:inline">Quick Calc</span>
              </button>

              {/* Favourites */}
              <button
                onClick={() => setIsFavouritesOpen(true)}
                className="hidden lg:flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-xs text-gray-300 relative"
                title="Favourites"
              >
                <FiStar className={favCount > 0 ? 'text-amber-400' : ''} />
                {favCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black px-1">
                    {favCount}
                  </span>
                )}
              </button>

              {/* Unit System Switcher */}
              <button
                onClick={() => setUnitSystem(unitSystem === 'UK' ? 'EU' : 'UK')}
                className="hidden lg:flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-xs text-gray-300"
                title="Unit System"
              >
                <FiGlobe />
                <span>{unitSystem} NA</span>
              </button>

              <BeaverButton
                title="BeaverCalc Studio"
                containerClass="bg-blue-50 text-black font-semibold md:flex hidden items-center gap-1 text-xs"
                onClick={() => navigate('/')}
              />

              {/* Visual Indicator */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleIndicator}
                  className="flex items-center space-x-0.5"
                  aria-label="Toggle Indicator"
                >
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={clsx('indicator-line', {
                        active: isIndicatorActive,
                      })}
                      style={{ animationDelay: `${bar * 0.1}s` }}
                    />
                  ))}
                </button>
              </div>
            </div>
          </nav>
        </header>
      </div>

      {/* Global Components */}
      <QuickCalcDrawer isOpen={isQuickCalcOpen} onClose={() => setIsQuickCalcOpen(false)} />
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <FavouritesModal isOpen={isFavouritesOpen} onClose={() => setIsFavouritesOpen(false)} />
    </>
  )
}

export default Header
