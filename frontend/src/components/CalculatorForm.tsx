import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'

const CalculatorForm: React.FC = () => {
  const { key } = useParams<{ key: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [inputs, setInputs] = useState<Record<string, any>>({})

  const calculatorConfigs: Record<string, {
    title: string
    fields: Array<{
      name: string
      label: string
      type: string
      placeholder?: string
      required?: boolean
      options?: Array<{ value: string, label: string }>
    }>
  }> = {
    'steel_beam_bending_v1': {
      title: 'Steel I-Beam Bending Check (EN 1993-1-1)',
      fields: [
        { name: 'section', label: 'Section', type: 'select', required: true,
          options: [
            { value: 'UKB 610x229x101', label: 'UKB 610x229x101' },
            { value: 'UKB 457x191x67', label: 'UKB 457x191x67' },
            { value: 'UKB 305x165x40', label: 'UKB 305x165x40' }
          ]
        },
        { name: 'span_m', label: 'Span (m)', type: 'number', placeholder: '18.0', required: true },
        { name: 'uniform_load_kN_per_m', label: 'Uniform Load (kN/m)', type: 'number', placeholder: '45.0', required: true },
        { name: 'lateral_restraint', label: 'Lateral Restraint', type: 'select', required: true,
          options: [
            { value: 'restrained', label: 'Restrained' },
            { value: 'unrestrained', label: 'Unrestrained' }
          ]
        },
        { name: 'steel_grade', label: 'Steel Grade', type: 'select', required: true,
          options: [
            { value: 'S355', label: 'S355' },
            { value: 'S275', label: 'S275' },
            { value: 'S460', label: 'S460' }
          ]
        }
      ]
    },
    'rc_slab_bending_v1': {
      title: 'RC Slab Bending Analysis (EN 1992-1-1)',
      fields: [
        { name: 'thickness_mm', label: 'Slab Thickness (mm)', type: 'number', placeholder: '200', required: true },
        { name: 'load_kN_m2', label: 'Uniform Load (kN/m²)', type: 'number', placeholder: '5.0', required: true }
      ]
    },
    'crane_pad_design_v1': {
      title: 'Crane Pad Design (BS 5975)',
      fields: [
        { name: 'crane_load_kN', label: 'Crane Load (kN)', type: 'number', placeholder: '1000', required: true },
        { name: 'pad_length_m', label: 'Pad Length (m)', type: 'number', placeholder: '3.0', required: true },
        { name: 'pad_width_m', label: 'Pad Width (m)', type: 'number', placeholder: '3.0', required: true },
        { name: 'ground_bearing_capacity_kN_m2', label: 'Ground Bearing Capacity (kN/m²)', type: 'number', placeholder: '200', required: true },
        { name: 'safety_factor', label: 'Safety Factor', type: 'number', placeholder: '2.0', required: true }
      ]
    },
    'pad_footing_bearing_v1': {
      title: 'Pad Footing Bearing Check (EN 1997-1)',
      fields: [
        { name: 'footing_length_m', label: 'Footing Length (m)', type: 'number', placeholder: '2.0', required: true },
        { name: 'footing_width_m', label: 'Footing Width (m)', type: 'number', placeholder: '2.0', required: true },
        { name: 'vertical_load_kN', label: 'Vertical Load (kN)', type: 'number', placeholder: '500', required: true },
        { name: 'horizontal_load_kN', label: 'Horizontal Load (kN)', type: 'number', placeholder: '50', required: true },
        { name: 'moment_kNm', label: 'Moment (kNm)', type: 'number', placeholder: '100', required: true },
        { name: 'soil_bearing_capacity_kN_m2', label: 'Soil Bearing Capacity (kN/m²)', type: 'number', placeholder: '200', required: true }
      ]
    }
  }

  const config = calculatorConfigs[key || '']

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Calculator Not Found</h1>
        <p className="text-gray-600">The calculator "{key}" is not available.</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await axios.post('/api/runs', {
        calculator: key,
        project_id: 1, // Default project
        inputs
      })

      navigate(`/results/${response.data.run.run_id}`)
    } catch (error) {
      console.error('Calculation failed:', error)
      alert('Calculation failed. Please check your inputs.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (name: string, value: any) => {
    setInputs(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
            {config.title}
          </span>
        </h1>
        <div className="w-32 h-1 bg-gradient-to-r from-neon-blue to-neon-purple mx-auto rounded-full"></div>
      </div>

      <Card variant="glass" className="border-neon-cyan/30 shadow-neon-cyan/10">
        <CardHeader>
          <CardTitle className="text-2xl text-white flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
            <span>Input Parameters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {config.fields.map((field, index) => (
                <div
                  key={field.name}
                  className="space-y-3 p-4 rounded-xl glass border border-glass-border hover:border-neon-cyan/50 transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <label className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-neon-cyan rounded-full"></span>
                    <span>
                      {field.label}
                      {field.required && <span className="text-neon-pink ml-1">*</span>}
                    </span>
                  </label>

                  {field.type === 'select' ? (
                    <select
                      value={inputs[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan focus:ring-2 focus:ring-neon-cyan/20 transition-all duration-300"
                      required={field.required}
                      title={field.label}
                    >
                      <option value="" className="bg-gray-800">Select...</option>
                      {field.options?.map(option => (
                        <option key={option.value} value={option.value} className="bg-gray-800">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={inputs[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan focus:ring-2 focus:ring-neon-cyan/20 transition-all duration-300"
                      required={field.required}
                      step={field.type === 'number' ? '0.01' : undefined}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center space-x-6">
              <Button
                type="button"
                onClick={() => navigate('/')}
                variant="glass"
                className="px-8 py-3 hover:border-neon-purple/50"
              >
                ← Back to Calculators
              </Button>
              <Button
                type="submit"
                disabled={loading}
                variant="neon"
                size="lg"
                className="px-8 py-3 cyber-glow-purple"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <span>🚀 Run Calculation</span>
                    <span className="text-lg">⚡</span>
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card variant="glass" className="mt-6 border-neon-purple/30 shadow-neon-purple/10">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-neon-purple to-neon-pink rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl">ℹ️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Calculation Standards</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                This calculator performs structural analysis according to Eurocode and UK standards.
                All calculations include appropriate safety factors and limit state checks.
                Results are provided for both ultimate and serviceability limit states.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CalculatorForm
