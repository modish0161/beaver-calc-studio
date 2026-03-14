import {
  BarChart3,
  Box,
  Building2,
  Cog,
  Dumbbell,
  Hammer,
  HardHat,
  Landmark,
  Layers,
  LineChart,
  Microscope,
  Mountain,
  Ruler,
  Scale,
  Shovel,
  TreePine,
  Truck,
  Wrench,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiArrowRight,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiGrid,
  FiList,
  FiSearch,
  FiStar,
  FiX,
} from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getActiveCalculators,
  searchCalculators,
  type CalculatorMetadata,
} from '../data/calculatorRegistry';

/* ──────────────────────────────────────────────────────────────────────────
   View mode, sort, and history types
   ────────────────────────────────────────────────────────────────────────── */
type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'category' | 'newest' | 'popular';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'category', label: 'Category' },
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
];

const SEARCH_HISTORY_KEY = 'calculator-search-history';
const MAX_SEARCH_HISTORY = 8;

function getSearchHistory(): string[] {
  try {
    const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function addSearchHistory(term: string) {
  if (!term.trim()) return;
  const history = getSearchHistory().filter((h) => h.toLowerCase() !== term.toLowerCase());
  history.unshift(term.trim());
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_SEARCH_HISTORY)));
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

/* ──────────────────────────────────────────────────────────────────────────
   Category icons & colours
   ────────────────────────────────────────────────────────────────────────── */
const CATEGORY_META: Record<string, { icon: React.ReactNode; accent: string }> = {
  Bridges: { icon: <Landmark size={22} />, accent: '#00D9FF' },
  Structures: { icon: <Building2 size={22} />, accent: '#9D4EDD' },
  'Temporary Works': { icon: <HardHat size={22} />, accent: '#FF6B35' },
  Geotechnics: { icon: <Mountain size={22} />, accent: '#06FFA5' },
  'Steel Connections': { icon: <Wrench size={22} />, accent: '#00D9FF' },
  Concrete: { icon: <Box size={22} />, accent: '#C0C0C0' },
  Timber: { icon: <TreePine size={22} />, accent: '#D4A574' },
  Composite: { icon: <Cog size={22} />, accent: '#9D4EDD' },
  'Construction Logistics': { icon: <Truck size={22} />, accent: '#FF006E' },
  'Site Tools': { icon: <Ruler size={22} />, accent: '#FFD60A' },
  'Loads & Analysis': { icon: <BarChart3 size={22} />, accent: '#00D9FF' },
  Loads: { icon: <Scale size={22} />, accent: '#FF006E' },
  Analysis: { icon: <LineChart size={22} />, accent: '#00D9FF' },
  Lifting: { icon: <Dumbbell size={22} />, accent: '#FF6B35' },
  Tools: { icon: <Hammer size={22} />, accent: '#FFD60A' },
  Earthworks: { icon: <Shovel size={22} />, accent: '#06FFA5' },
  'Retaining Structures': { icon: <Layers size={22} />, accent: '#C0C0C0' },
  'Ground Improvement': { icon: <Microscope size={22} />, accent: '#9D4EDD' },
};

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? { icon: <Ruler size={22} />, accent: '#00D9FF' };
}

/* ──────────────────────────────────────────────────────────────────────────
   Badge helper
   ────────────────────────────────────────────────────────────────────────── */
function badgeClasses(badge?: 'verified' | 'beta' | 'new') {
  switch (badge) {
    case 'verified':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'beta':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'new':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    default:
      return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   CALCULATOR LIST
   ────────────────────────────────────────────────────────────────────────── */
const CalculatorList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [calculators, setCalculators] = useState<CalculatorMetadata[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('calculatorFavorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  // Phase 3: View mode & sort
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('calculator-view-mode');
    return (saved as ViewMode) || 'grid';
  });
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem('calculator-sort');
    return (saved as SortOption) || 'name';
  });
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Phase 3: Search history & autocomplete
  const [searchHistory, setSearchHistory] = useState<string[]>(getSearchHistory);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [hoveredCalc, setHoveredCalc] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Phase 3: Eurocode filter
  const [showEurocodeDropdown, setShowEurocodeDropdown] = useState(false);

  const categoryFilter = searchParams.get('category');
  const subcategoryFilter = searchParams.get('subcategory');
  const statusFilter = searchParams.get('status');
  const searchQuery = searchParams.get('search');
  const favoritesFilter = searchParams.get('favorites');
  const eurocodeFilter = searchParams.get('eurocode');

  const toggleFavorite = (key: string) => {
    setFavorites((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem('calculatorFavorites', JSON.stringify(next));
      return next;
    });
  };

  // Persist view mode and sort
  useEffect(() => {
    localStorage.setItem('calculator-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('calculator-sort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    try {
      let all = getActiveCalculators();
      if (categoryFilter)
        all = all.filter((c) => c.category.toLowerCase().includes(categoryFilter.toLowerCase()));
      if (subcategoryFilter)
        all = all.filter((c) =>
          c.subcategory.toLowerCase().includes(subcategoryFilter.toLowerCase()),
        );
      if (statusFilter) all = all.filter((c) => c.badge === statusFilter);
      if (searchQuery) all = searchCalculators(searchQuery);
      if (favoritesFilter === 'true') all = all.filter((c) => favorites.includes(c.key));
      if (eurocodeFilter)
        all = all.filter((c) =>
          c.eurocodes?.some((code) => code.toLowerCase().includes(eurocodeFilter.toLowerCase())),
        );
      setCalculators(all);
    } catch {
      setError('Failed to load calculators');
    } finally {
      setLoading(false);
    }
  }, [
    categoryFilter,
    subcategoryFilter,
    statusFilter,
    searchQuery,
    favoritesFilter,
    favorites,
    eurocodeFilter,
  ]);

  // Sort calculators
  const sortedCalculators = useMemo(() => {
    const sorted = [...calculators];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'category':
        return sorted.sort(
          (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
        );
      case 'newest':
        return sorted.sort((a, b) => (b.badge === 'new' ? 1 : 0) - (a.badge === 'new' ? 1 : 0));
      case 'popular':
        return sorted.sort(
          (a, b) => (favorites.includes(b.key) ? 1 : 0) - (favorites.includes(a.key) ? 1 : 0),
        );
      default:
        return sorted;
    }
  }, [calculators, sortBy, favorites]);

  // Get all unique eurocodes for dropdown
  const allEurocodes = useMemo(() => {
    const codes = new Set<string>();
    getActiveCalculators().forEach((c) => c.eurocodes?.forEach((code) => codes.add(code)));
    return Array.from(codes).sort();
  }, []);

  const handleLocalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      addSearchHistory(localSearch.trim());
      setSearchHistory(getSearchHistory());
      searchParams.set('search', localSearch.trim());
      setSearchParams(searchParams);
      setShowSearchHistory(false);
    }
  };

  const selectSearchHistory = (term: string) => {
    setLocalSearch(term);
    searchParams.set('search', term);
    setSearchParams(searchParams);
    setShowSearchHistory(false);
  };

  const clearFilters = () => setSearchParams({});

  /* --- Derive categories for the tab bar --- */
  const allCalcs = getActiveCalculators();
  const categories = Array.from(new Set(allCalcs.map((c) => c.category)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasActiveFilters =
    categoryFilter ||
    subcategoryFilter ||
    statusFilter ||
    searchQuery ||
    favoritesFilter ||
    eurocodeFilter;

  return (
    <section id="calculators" className="relative py-24 bg-[#0c0e1a]">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #00D9FF 0.5px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00D9FF]/20 bg-[#00D9FF]/[0.05] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
            <span className="text-xs font-semibold text-[#00D9FF] uppercase tracking-[0.2em]">
              Engineering Suite
            </span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white uppercase font-zentry leading-[0.95] mb-6">
            Calculator <span className="text-[#00D9FF]">Library</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {allCalcs.length} professional calculators across {categories.length} engineering
            disciplines — Eurocode verified, UK National Annex compliant.
          </p>
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col gap-4 mb-10">
          {/* Top row: Search + View/Sort controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            {/* Search with history */}
            <form onSubmit={handleLocalSearch} className="flex-1 relative">
              <FiSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                ref={searchInputRef}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onFocus={() => setShowSearchHistory(true)}
                onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                placeholder="Search calculators…"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-gray-500 focus:border-[#00D9FF]/40 focus:outline-none focus:ring-1 focus:ring-[#00D9FF]/20 transition-all text-sm"
              />
              {/* Search history dropdown */}
              {showSearchHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 py-2 rounded-xl bg-[#1a1d2e] border border-white/[0.08] shadow-xl z-50">
                  <div className="flex items-center justify-between px-3 pb-2 mb-2 border-b border-white/[0.06]">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        clearSearchHistory();
                        setSearchHistory([]);
                      }}
                      className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  {searchHistory.map((term, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectSearchHistory(term)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.04] hover:text-white transition-colors text-left"
                    >
                      <FiClock size={14} className="text-gray-500" />
                      {term}
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Eurocode filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowEurocodeDropdown(!showEurocodeDropdown)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border flex items-center gap-2 whitespace-nowrap ${
                  eurocodeFilter
                    ? 'bg-[#00D9FF]/15 border-[#00D9FF]/30 text-[#00D9FF]'
                    : 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white hover:border-white/10'
                }`}
              >
                {eurocodeFilter || 'Eurocode'}
                <FiChevronDown
                  size={14}
                  className={`transition-transform ${showEurocodeDropdown ? 'rotate-180' : ''}`}
                />
              </button>
              {showEurocodeDropdown && (
                <div className="absolute top-full right-0 mt-2 py-2 rounded-xl bg-[#1a1d2e] border border-white/[0.08] shadow-xl z-50 max-h-64 overflow-y-auto min-w-[180px]">
                  <button
                    onClick={() => {
                      searchParams.delete('eurocode');
                      setSearchParams(searchParams);
                      setShowEurocodeDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-left text-gray-400 hover:bg-white/[0.04] hover:text-white transition-colors"
                  >
                    All Standards
                  </button>
                  {allEurocodes.map((code) => (
                    <button
                      key={code}
                      onClick={() => {
                        searchParams.set('eurocode', code);
                        setSearchParams(searchParams);
                        setShowEurocodeDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                        eurocodeFilter === code
                          ? 'bg-[#00D9FF]/10 text-[#00D9FF]'
                          : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="px-4 py-3 rounded-xl text-sm font-medium bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/10 transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
              >
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                <FiChevronDown
                  size={14}
                  className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`}
                />
              </button>
              {showSortDropdown && (
                <div className="absolute top-full right-0 mt-2 py-2 rounded-xl bg-[#1a1d2e] border border-white/[0.08] shadow-xl z-50 min-w-[140px]">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortBy(opt.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                        sortBy === opt.value
                          ? 'bg-[#00D9FF]/10 text-[#00D9FF]'
                          : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View mode toggle */}
            <div className="flex rounded-xl border border-white/[0.08] overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-3 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#00D9FF]/15 text-[#00D9FF]'
                    : 'bg-white/[0.04] text-gray-400 hover:text-white'
                }`}
                title="Grid view"
              >
                <FiGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-3 transition-colors border-l border-white/[0.08] ${
                  viewMode === 'list'
                    ? 'bg-[#00D9FF]/15 text-[#00D9FF]'
                    : 'bg-white/[0.04] text-gray-400 hover:text-white'
                }`}
                title="List view"
              >
                <FiList size={18} />
              </button>
            </div>
          </div>

          {/* Category quick-filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={clearFilters}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
                !hasActiveFilters
                  ? 'bg-[#00D9FF]/15 border-[#00D9FF]/30 text-[#00D9FF]'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:border-white/10'
              }`}
            >
              All ({allCalcs.length})
            </button>
            <button
              onClick={() => {
                if (favoritesFilter === 'true') {
                  searchParams.delete('favorites');
                } else {
                  searchParams.set('favorites', 'true');
                }
                setSearchParams(searchParams);
              }}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
                favoritesFilter === 'true'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:text-white hover:border-white/10'
              }`}
            >
              <FiStar className="inline mr-1 -mt-0.5" size={12} />
              Favourites
            </button>
          </div>
        </div>

        {/* Active filter tags */}
        {hasActiveFilters && (
          <div className="flex items-center flex-wrap gap-2 mb-8">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mr-1">
              Filters:
            </span>
            {categoryFilter && (
              <FilterTag
                label={`Category: ${categoryFilter}`}
                onRemove={() => {
                  searchParams.delete('category');
                  setSearchParams(searchParams);
                }}
              />
            )}
            {subcategoryFilter && (
              <FilterTag
                label={`Sub: ${subcategoryFilter}`}
                onRemove={() => {
                  searchParams.delete('subcategory');
                  setSearchParams(searchParams);
                }}
              />
            )}
            {statusFilter && (
              <FilterTag
                label={`Status: ${statusFilter}`}
                onRemove={() => {
                  searchParams.delete('status');
                  setSearchParams(searchParams);
                }}
              />
            )}
            {searchQuery && (
              <FilterTag
                label={`"${searchQuery}"`}
                onRemove={() => {
                  searchParams.delete('search');
                  setSearchParams(searchParams);
                  setLocalSearch('');
                }}
              />
            )}
            {eurocodeFilter && (
              <FilterTag
                label={`Eurocode: ${eurocodeFilter}`}
                onRemove={() => {
                  searchParams.delete('eurocode');
                  setSearchParams(searchParams);
                }}
              />
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-red-400/70 hover:text-red-300 ml-2 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Calculator grid/list */}
        {sortedCalculators.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl mb-6 block">🔍</span>
            <h3 className="text-2xl font-bold text-white mb-3">No calculators found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your filters or search terms.</p>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 rounded-lg border border-white/10 text-white text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* List view */
          <div className="flex flex-col gap-3">
            {sortedCalculators.map((calc) => {
              const meta = getCategoryMeta(calc.category);
              const isFav = favorites.includes(calc.key);
              const isHovered = hoveredCalc === calc.key;
              return (
                <div
                  key={calc.key}
                  className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-[color:var(--accent)]/30 transition-all duration-300 overflow-hidden"
                  style={{ '--accent': meta.accent } as React.CSSProperties}
                  onMouseEnter={() => setHoveredCalc(calc.key)}
                  onMouseLeave={() => setHoveredCalc(null)}
                >
                  <div className="relative flex items-center gap-4 p-4">
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: `${meta.accent}18`,
                        border: `1px solid ${meta.accent}30`,
                        color: meta.accent,
                      }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-white group-hover:text-[color:var(--accent)] transition-colors truncate">
                          {calc.name}
                        </h3>
                        {calc.badge && (
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeClasses(calc.badge)}`}
                          >
                            {calc.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">{calc.description}</p>
                    </div>

                    {/* Tags */}
                    <div className="hidden md:flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border bg-white/[0.03] border-white/[0.06] text-gray-400">
                        {calc.category}
                      </span>
                      {calc.eurocodes?.[0] && (
                        <span className="text-[10px] font-mono text-[#00D9FF]/60 px-2 py-1 rounded border border-[#00D9FF]/10 bg-[#00D9FF]/[0.04]">
                          {calc.eurocodes[0]}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFavorite(calc.key)}
                        className={`p-2 rounded-lg transition-colors ${isFav ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'}`}
                        aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                      >
                        <FiStar size={16} className={isFav ? 'fill-current' : ''} />
                      </button>
                      <Link
                        to={`/calculator/${calc.key}`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 border"
                        style={{
                          color: meta.accent,
                          borderColor: `${meta.accent}30`,
                          background: `${meta.accent}10`,
                        }}
                      >
                        Launch
                        <FiArrowRight size={14} />
                      </Link>
                    </div>
                  </div>

                  {/* Quick preview tooltip */}
                  {isHovered && calc.subcategory && (
                    <div className="absolute left-0 right-0 bottom-full mb-2 mx-4 p-3 rounded-lg bg-[#1a1d2e] border border-white/[0.08] shadow-xl z-50 pointer-events-none">
                      <div className="text-xs text-gray-400">
                        <span className="text-gray-500">Subcategory:</span> {calc.subcategory}
                        {calc.eurocodes && calc.eurocodes.length > 1 && (
                          <span className="ml-3">
                            <span className="text-gray-500">Standards:</span>{' '}
                            {calc.eurocodes.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sortedCalculators.map((calc) => {
              const meta = getCategoryMeta(calc.category);
              const isFav = favorites.includes(calc.key);
              return (
                <div
                  key={calc.key}
                  className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-[color:var(--accent)]/30 transition-all duration-300 overflow-hidden"
                  style={{ '--accent': meta.accent } as React.CSSProperties}
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at 50% 0%, ${meta.accent}08 0%, transparent 70%)`,
                    }}
                  />

                  <div className="relative p-6">
                    {/* Top row: icon + favourite */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: `${meta.accent}18`,
                          border: `1px solid ${meta.accent}30`,
                          color: meta.accent,
                        }}
                      >
                        {meta.icon}
                      </div>
                      <button
                        onClick={() => toggleFavorite(calc.key)}
                        className={`p-1.5 rounded-lg transition-colors ${isFav ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'}`}
                        aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                      >
                        <FiStar size={16} className={isFav ? 'fill-current' : ''} />
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-white mb-1.5 leading-snug group-hover:text-[color:var(--accent)] transition-colors duration-300">
                      {calc.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-2">
                      {calc.description}
                    </p>

                    {/* Badges row */}
                    <div className="flex items-center flex-wrap gap-2 mb-5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-white/[0.03] border-white/[0.06] text-gray-400">
                        {calc.category}
                      </span>
                      {calc.badge && (
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md border ${badgeClasses(calc.badge)}`}
                        >
                          {calc.badge === 'verified' && (
                            <FiCheck className="inline mr-0.5 -mt-0.5" size={10} />
                          )}
                          {calc.badge}
                        </span>
                      )}
                      {calc.eurocodes?.[0] && (
                        <span className="text-[10px] font-mono text-[#00D9FF]/60 px-2 py-1 rounded-md border border-[#00D9FF]/10 bg-[#00D9FF]/[0.04]">
                          {calc.eurocodes[0]}
                        </span>
                      )}
                    </div>

                    {/* Launch link */}
                    <Link
                      to={`/calculator/${calc.key}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border"
                      style={{
                        color: meta.accent,
                        borderColor: `${meta.accent}20`,
                        background: `${meta.accent}08`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = `${meta.accent}40`;
                        e.currentTarget.style.background = `${meta.accent}15`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = `${meta.accent}20`;
                        e.currentTarget.style.background = `${meta.accent}08`;
                      }}
                    >
                      Launch Calculator
                      <FiArrowRight
                        size={14}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom summary */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full border border-white/[0.06] bg-white/[0.02]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-gray-400">
              <span className="font-semibold text-white">{allCalcs.length} calculators</span> fully
              operational — EN / BS standards verified
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Filter tag pill
   ────────────────────────────────────────────────────────────────────────── */
const FilterTag: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white font-medium">
    {label}
    <button
      onClick={onRemove}
      className="hover:text-red-400 transition-colors"
      aria-label={`Remove filter ${label}`}
    >
      <FiX size={12} />
    </button>
  </span>
);

export default CalculatorList;
