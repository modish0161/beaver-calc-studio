import React, { useState } from 'react'
import { quickCalculators, QuickCalc } from '../data/navigation'

interface QuickCalcDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const QuickCalcDrawer: React.FC<QuickCalcDrawerProps> = ({ isOpen, onClose }) => {
  const [activeCalc, setActiveCalc] = useState<QuickCalc | null>(null)
  const [inputs, setInputs] = useState<Record<string, number>>({})
  const [results, setResults] = useState<Record<string, number> | null>(null)

  const handleCalculate = () => {
    if (activeCalc) {
      const calculated = activeCalc.calculate(inputs)
      setResults(calculated)
    }
  }

  const handleInputChange = (name: string, value: string) => {
    const numValue = parseFloat(value)
    setInputs((prev) => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }))
    setResults(null) // Clear results when inputs change
  }

  const selectCalculator = (calc: QuickCalc) => {
    setActiveCalc(calc)
    setInputs({})
    setResults(null)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-turquoise border-l border-white/20 shadow-2xl z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-white">⚡ Quick Calc</h2>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white text-2xl transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-300">
              Fast engineering calculations at your fingertips
            </p>
          </div>

          {/* Calculator List */}
          <div className="flex-1 overflow-y-auto p-4">
            {!activeCalc ? (
              <div className="space-y-2">
                {quickCalculators.map((calc) => (
                  <button
                    key={calc.id}
                    onClick={() => selectCalculator(calc)}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl">{calc.icon}</span>
                      <h3 className="text-white font-semibold group-hover:text-blue-100">
                        {calc.label}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 ml-11">
                      {calc.description}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Back Button */}
                <button
                  onClick={() => {
                    setActiveCalc(null)
                    setInputs({})
                    setResults(null)
                  }}
                  className="text-sm text-blue-100 hover:text-white flex items-center gap-2"
                >
                  ← Back to calculators
                </button>

                {/* Active Calculator */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{activeCalc.icon}</span>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        {activeCalc.label}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {activeCalc.description}
                      </p>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-3 mb-4">
                    {activeCalc.inputs.map((input) => (
                      <div key={input.name}>
                        <label className="text-sm text-gray-300 mb-1 block">
                          {input.name.charAt(0).toUpperCase() + input.name.slice(1)}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder={input.placeholder}
                            className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder-gray-500"
                            onChange={(e) =>
                              handleInputChange(input.name, e.target.value)
                            }
                          />
                          <span className="px-3 py-2 bg-white/5 border border-white/20 rounded text-gray-300 text-sm">
                            {input.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculate Button */}
                  <button
                    onClick={handleCalculate}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-black font-semibold py-3 rounded-lg transition-all"
                  >
                    Calculate
                  </button>

                  {/* Results */}
                  {results && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <h4 className="text-green-300 font-semibold mb-2">
                        Results:
                      </h4>
                      <div className="space-y-1">
                        {Object.entries(results).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between text-sm text-white"
                          >
                            <span className="text-gray-300">{key}:</span>
                            <span className="font-mono font-bold">
                              {typeof value === 'number'
                                ? value.toFixed(2)
                                : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/20">
            <p className="text-xs text-gray-400 text-center">
              Quick calcs for preliminary checks only
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default QuickCalcDrawer
