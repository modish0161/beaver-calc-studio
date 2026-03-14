import axios from 'axios'
import { motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { FiDownload, FiFile, FiFileText } from 'react-icons/fi'
import { Link, useParams } from 'react-router-dom'
import { calculatorToasts, toast } from '../lib/toast'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface CalculationResults {
  [key: string]: any
}

const ResultsView: React.FC = () => {
  const { runId } = useParams<{ runId: string }>()
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)

  // Export functions
  const handleExportPDF = async () => {
    if (!runId) return
    
    setExporting('pdf')
    calculatorToasts.exportStarted('PDF')
    
    try {
      const response = await axios.get(`/api/runs/${runId}/report/pdf`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `calculation_report_${runId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      calculatorToasts.exportCompleted('PDF')
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('Failed to generate PDF report')
    } finally {
      setExporting(null)
    }
  }

  const handleExportDOCX = async () => {
    if (!runId) return
    
    setExporting('docx')
    calculatorToasts.exportStarted('DOCX')
    
    try {
      const response = await axios.get(`/api/runs/${runId}/report/docx`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `calculation_report_${runId}.docx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      calculatorToasts.exportCompleted('DOCX')
    } catch (error) {
      console.error('DOCX export failed:', error)
      toast.error('Failed to generate DOCX report')
    } finally {
      setExporting(null)
    }
  }

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await axios.get(`/api/runs/${runId}`)
        setResults(response.data.run.results)
      } catch (err) {
        setError('Failed to load results')
        console.error('Error fetching results:', err)
      } finally {
        setLoading(false)
      }
    }

    if (runId) {
      fetchResults()
    }
  }, [runId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center mx-auto mb-4 cyber-glow-blue">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-xl text-gray-300">Analysing structural data...</p>
          <p className="text-sm text-gray-400 mt-2">Performing advanced calculations</p>
        </div>
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-neon-red to-neon-pink bg-clip-text text-transparent">
              Error Loading Results
            </span>
          </h1>
        </div>
        <Card variant="glass" className="border-red-500/30">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <p className="text-red-300 text-lg">{error || 'No results found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderResultValue = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-bold ${
          value
            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current"></span>
          <span>{value ? 'PASS ✓' : 'FAIL ✗'}</span>
        </div>
      )
    }
    if (typeof value === 'number') {
      return (
        <span className="text-2xl font-mono font-bold text-neon-cyan">
          {value.toFixed(3)}
        </span>
      )
    }
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
          {value.map((item, index) => (
            <li key={index} className="text-gray-300">{item}</li>
          ))}
        </ul>
      )
    }
    return (
      <span className="text-lg text-white font-semibold">
        {String(value)}
      </span>
    )
  }

  const getCardVariant = (key: string) => {
    if (key.includes('check') || key.includes('overall')) {
      return results[key] ? 'border-green-500/30 shadow-green-500/10' : 'border-red-500/30 shadow-red-500/10'
    }
    if (key.includes('utilisation')) {
      const value = results[key]
      if (value > 1.0) return 'border-red-500/30 shadow-red-500/10'
      if (value > 0.8) return 'border-yellow-500/30 shadow-yellow-500/10'
      return 'border-green-500/30 shadow-green-500/10'
    }
    return 'border-neon-cyan/30 shadow-neon-cyan/10'
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
            Analysis Results
          </span>
        </h1>
        <div className="w-32 h-1 bg-gradient-to-r from-neon-blue to-neon-purple mx-auto rounded-full mb-4"></div>
        <p className="text-gray-400 mb-6">Structural calculation completed with advanced algorithms</p>
        
        {/* Export Buttons */}
        <div className="flex items-center justify-center space-x-4 mt-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="neon"
              size="lg"
              onClick={handleExportPDF}
              disabled={exporting === 'pdf'}
              className="cyber-glow-blue"
            >
              {exporting === 'pdf' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <FiFileText className="mr-2" size={20} />
                  Export PDF Report
                </>
              )}
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="lg"
              onClick={handleExportDOCX}
              disabled={exporting === 'docx'}
              className="border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10"
            >
              {exporting === 'docx' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neon-purple mr-2"></div>
                  Generating DOCX...
                </>
              ) : (
                <>
                  <FiFile className="mr-2" size={20} />
                  Export Word Report
                </>
              )}
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="lg"
              className="text-gray-400 hover:text-white"
            >
              <FiDownload className="mr-2" size={20} />
              Download All
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Overall Status */}
      {results.overall_check !== undefined && (
        <Card
          variant="glass"
          className={`mb-8 border-2 ${
            results.overall_check
              ? 'border-green-500/50 shadow-green-500/20 cyber-glow-green'
              : 'border-red-500/50 shadow-red-500/20 cyber-glow-red'
          }`}
        >
          <CardContent className="p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              results.overall_check
                ? 'bg-gradient-to-br from-green-500 to-green-600'
                : 'bg-gradient-to-br from-red-500 to-red-600'
            }`}>
              <span className="text-4xl">
                {results.overall_check ? '✅' : '❌'}
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-4">
              <span className={results.overall_check ? 'text-green-300' : 'text-red-300'}>
                Overall Status: {results.overall_check ? 'PASS ✓' : 'FAIL ✗'}
              </span>
            </h2>
            <p className={`text-lg ${results.overall_check ? 'text-green-300' : 'text-red-300'}`}>
              {results.overall_check
                ? '🎉 All structural checks passed. Design is acceptable for construction.'
                : '⚠️ Some checks failed. Please review results and modify design parameters.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Object.entries(results).map(([key, value], index) => {
          if (key === 'overall_check' || key === 'warnings' || key === 'notes') return null

          return (
            <Card
              key={key}
              variant="glass"
              className={`group hover:scale-105 transition-all duration-500 ${getCardVariant(key)}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <div className="w-8 h-8 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs">📊</span>
                  </div>
                </div>
                <div className="text-center">
                  {renderResultValue(key, value)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Warnings */}
      {results.warnings && results.warnings.length > 0 && (
        <Card variant="glass" className="mb-6 border-yellow-500/30 shadow-yellow-500/10">
          <CardHeader>
            <CardTitle className="text-yellow-300 flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
              <span>Design Warnings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {results.warnings.map((warning: string, index: number) => (
                <li key={index} className="flex items-start space-x-3 text-yellow-200">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {results.notes && results.notes.length > 0 && (
        <Card variant="glass" className="mb-6 border-blue-500/30 shadow-blue-500/10">
          <CardHeader>
            <CardTitle className="text-blue-300 flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">ℹ️</span>
              </div>
              <span>Technical Notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {results.notes.map((note: string, index: number) => (
                <li key={index} className="flex items-start space-x-3 text-blue-200">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center space-x-6">
        <Button
          variant="glass"
          size="lg"
          className="px-8 py-4 hover:border-neon-purple/50"
          onClick={() => window.history.back()}
        >
          <span className="flex items-center space-x-2">
            <span>←</span>
            <span>Back to Calculator</span>
          </span>
        </Button>
        <Link to="/">
          <Button
            variant="neon"
            size="lg"
            className="px-8 py-4 cyber-glow-purple"
          >
            <span className="flex items-center space-x-2">
              <span>🏠 New Analysis</span>
              <span className="text-lg">⚡</span>
            </span>
          </Button>
        </Link>
        <Button
          variant="glass"
          size="lg"
          className="px-8 py-4 hover:border-neon-green/50"
          onClick={() => window.print()}
        >
          <span className="flex items-center space-x-2">
            <span>🖨️ Export Report</span>
          </span>
        </Button>
      </div>
    </div>
  )
}

export default ResultsView
