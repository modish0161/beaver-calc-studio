import React, { useState } from 'react'
import { FiHelpCircle, FiX } from 'react-icons/fi'

interface ExplainTooltipProps {
  title: string
  method?: string
  eurocodeClause?: string
  equation?: string
  assumptions?: string[]
  references?: string[]
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const ExplainTooltip: React.FC<ExplainTooltipProps> = ({
  title,
  method,
  eurocodeClause,
  equation,
  assumptions = [],
  references = [],
  position = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-blue-400 hover:text-blue-300 transition-colors"
        title="Explain this calculation"
      >
        <FiHelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute ${positionClasses[position]} z-50 w-80 bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl p-4 text-left`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-sm font-bold text-white pr-6">{title}</h4>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close explanation"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Eurocode Clause */}
          {eurocodeClause && (
            <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
              <p className="text-xs text-blue-300 font-mono">{eurocodeClause}</p>
            </div>
          )}

          {/* Method */}
          {method && (
            <div className="mb-3">
              <h5 className="text-xs font-semibold text-gray-300 mb-1">Method:</h5>
              <p className="text-xs text-gray-400 leading-relaxed">{method}</p>
            </div>
          )}

          {/* Equation */}
          {equation && (
            <div className="mb-3 p-2 bg-white/5 rounded border border-white/10">
              <p className="text-xs text-white font-mono">{equation}</p>
            </div>
          )}

          {/* Assumptions */}
          {assumptions.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-semibold text-gray-300 mb-1">Assumptions:</h5>
              <ul className="text-xs text-gray-400 space-y-1">
                {assumptions.map((assumption, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* References */}
          {references.length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <h5 className="text-xs font-semibold text-gray-300 mb-1">References:</h5>
              <ul className="text-xs text-gray-400 space-y-1">
                {references.map((reference, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-400">📄</span>
                    <span>{reference}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ExplainTooltip
