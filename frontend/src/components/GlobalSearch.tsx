import React, { useState } from 'react'
import { FiFilter, FiSearch, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { calculatorRegistry } from '../data/calculatorRegistry'
import { navigationStructure } from '../data/navigation'

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  title: string
  path: string
  category: string
  badge?: 'verified' | 'beta' | 'new'
  description?: string
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    tags: [] as string[],
    eurocodes: [] as string[],
  })
  const [showFilters, setShowFilters] = useState(false)
  const navigate = useNavigate()

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    
    if (!searchQuery.trim() && !filters.category && !filters.subcategory && filters.tags.length === 0 && filters.eurocodes.length === 0) {
      setResults([])
      return
    }

    const allResults: SearchResult[] = []
    const lowerQuery = searchQuery.toLowerCase()

    // Search in navigation structure (existing)
    navigationStructure.forEach((section) => {
      section.categories.forEach((category) => {
        category.items.forEach((item) => {
          if (
            item.label.toLowerCase().includes(lowerQuery) ||
            item.description?.toLowerCase().includes(lowerQuery) ||
            section.title.toLowerCase().includes(lowerQuery)
          ) {
            allResults.push({
              title: item.label,
              path: item.path,
              category: `${section.title} → ${category.label}`,
              badge: item.badge,
              description: item.description,
            })
          }
        })
      })
    })

    // Search in calculator registry (enhanced)
    Object.values(calculatorRegistry).forEach((calc) => {
      // Check if this calculator is already in results
      const alreadyExists = allResults.some(result => result.path === `/calculator/${calc.key}`)
      
      // Check if calculator matches search criteria
      const matchesSearch = !searchQuery.trim() || (
        calc.name.toLowerCase().includes(lowerQuery) ||
        calc.description.toLowerCase().includes(lowerQuery) ||
        calc.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        calc.eurocodes.some(code => code.toLowerCase().includes(lowerQuery)) ||
        calc.category.toLowerCase().includes(lowerQuery) ||
        calc.subcategory.toLowerCase().includes(lowerQuery)
      )
      
      // Check if calculator matches filters
      const matchesFilters = (
        (!filters.category || calc.category === filters.category) &&
        (!filters.subcategory || calc.subcategory === filters.subcategory) &&
        (filters.tags.length === 0 || filters.tags.every(tag => calc.tags.includes(tag))) &&
        (filters.eurocodes.length === 0 || filters.eurocodes.every(code => calc.eurocodes.includes(code)))
      )
      
      if (!alreadyExists && matchesSearch && matchesFilters) {
        allResults.push({
          title: calc.name,
          path: `/calculator/${calc.key}`,
          category: `${calc.category} → ${calc.subcategory}`,
          badge: calc.badge,
          description: calc.description,
        })
      }
    })

    setResults(allResults.slice(0, 15)) // Increase limit to 15 results
  }

  const handleSelectResult = (path: string) => {
    navigate(path)
    onClose()
    setQuery('')
    setResults([])
  }

  const resetFilters = () => {
    setFilters({
      category: '',
      subcategory: '',
      tags: [],
      eurocodes: [],
    })
    setQuery('')
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (!isOpen) {
          // Parent component should handle opening
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Trigger search when filters change
  React.useEffect(() => {
    handleSearch(query)
  }, [filters])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <div className="bg-gray-950 border border-white/20 rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-white/20">
            <FiSearch className="text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search calculators, tools, and features... (Ctrl+K)"
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-lg"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Advanced Filters"
            >
              <FiFilter className={`text-gray-400 ${showFilters ? 'text-neon-cyan' : ''}`} size={20} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="p-4 border-b border-white/20 bg-white/5">
              <div className="text-sm text-gray-300 mb-3 flex items-center gap-2">
                <FiFilter size={16} />
                <span>Advanced Filters</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Category</label>
                  <select
                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                  >
                    <option value="">All Categories</option>
                    <option value="Structures">Structures</option>
                    <option value="Bridges">Bridges</option>
                    <option value="Geotechnics">Geotechnics</option>
                    <option value="Temporary Works">Temporary Works</option>
                    <option value="Analysis">Analysis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Subcategory</label>
                  <select
                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                    value={filters.subcategory}
                    onChange={(e) => setFilters({...filters, subcategory: e.target.value})}
                  >
                    <option value="">All Subcategories</option>
                    <option value="Steel Members">Steel Members</option>
                    <option value="Concrete">Concrete</option>
                    <option value="Foundations">Foundations</option>
                    <option value="Superstructure">Superstructure</option>
                    <option value="Working Platforms & Crane Pads">Working Platforms & Crane Pads</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400 flex justify-between items-center">
                <span>Tip: Search by tags (e.g. "steel", "concrete") or eurocodes (e.g. "EN 1993-1-1")</span>
                {(filters.category || filters.subcategory) && (
                  <button 
                    onClick={resetFilters}
                    className="text-xs text-neon-cyan hover:text-neon-blue transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {results.length === 0 && query.trim() !== '' ? (
              <div className="p-8 text-center text-gray-400">
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-2">
                  Try searching for calculators, tools, or features
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>Start typing to search...</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="text-xs bg-white/5 px-3 py-1 rounded-full">
                    crane pad
                  </span>
                  <span className="text-xs bg-white/5 px-3 py-1 rounded-full">
                    steel beam
                  </span>
                  <span className="text-xs bg-white/5 px-3 py-1 rounded-full">
                    RC slab
                  </span>
                  <span className="text-xs bg-white/5 px-3 py-1 rounded-full">
                    working platform
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.path}-${index}`}
                    onClick={() => handleSelectResult(result.path)}
                    className="w-full px-4 py-3 hover:bg-white/10 transition-colors text-left flex items-start justify-between group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold group-hover:text-blue-100">
                          {result.title}
                        </h3>
                        {result.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              result.badge === 'verified'
                                ? 'bg-green-500/20 text-green-300'
                                : result.badge === 'beta'
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {result.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{result.category}</p>
                      {result.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {result.description}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-500 group-hover:text-blue-100 transition-colors">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/20 bg-white/5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Navigate with ↑↓ arrows</span>
              <span>Press Enter to select</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default GlobalSearch
