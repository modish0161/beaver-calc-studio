import { motion } from 'framer-motion'
import React from 'react'
import { FiAlertTriangle, FiCheck, FiInfo, FiX, FiZap } from 'react-icons/fi'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { calculatorToasts, projectToasts, toast } from '../lib/toast'

const ToastDemo: React.FC = () => {
  const demoPromise = () => new Promise((resolve) => setTimeout(resolve, 2000))

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-6xl font-black text-white mb-4">
            <span className="text-gradient-rainbow">Toast</span> Notifications
          </h1>
          <p className="text-gray-400 text-xl mb-12">
            Elegant notification system with glass morphism effects
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Toasts */}
            <Card variant="glass" className="border-2 border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Basic Toasts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="neon"
                  className="w-full cyber-glow-green"
                  onClick={() => toast.success('Success! Everything worked perfectly.')}
                >
                  <FiCheck className="mr-2" />
                  Success Toast
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10"
                  onClick={() => toast.error('Error! Something went wrong.')}
                >
                  <FiX className="mr-2" />
                  Error Toast
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10"
                  onClick={() => toast.info('Info: This is an informational message.')}
                >
                  <FiInfo className="mr-2" />
                  Info Toast
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                  onClick={() => toast.warning('Warning: Please review this carefully.')}
                >
                  <FiAlertTriangle className="mr-2" />
                  Warning Toast
                </Button>
              </CardContent>
            </Card>

            {/* Calculator Toasts */}
            <Card variant="glass" className="border-2 border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Calculator Toasts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => calculatorToasts.runStarted('Steel Beam Bending')}
                >
                  <FiZap className="mr-2" />
                  Run Started
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => calculatorToasts.runCompleted('Steel Beam Bending')}
                >
                  <FiCheck className="mr-2" />
                  Run Completed
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => calculatorToasts.runFailed('Steel Beam Bending', 'Invalid input parameters')}
                >
                  <FiX className="mr-2" />
                  Run Failed
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => calculatorToasts.savedDraft()}
                >
                  <FiInfo className="mr-2" />
                  Draft Saved
                </Button>
              </CardContent>
            </Card>

            {/* Export Toasts */}
            <Card variant="glass" className="border-2 border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Export Toasts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    calculatorToasts.exportStarted('PDF')
                    setTimeout(() => calculatorToasts.exportCompleted('PDF'), 2000)
                  }}
                >
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    calculatorToasts.exportStarted('DOCX')
                    setTimeout(() => calculatorToasts.exportCompleted('DOCX'), 2000)
                  }}
                >
                  Export DOCX
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    calculatorToasts.exportStarted('DXF')
                    setTimeout(() => calculatorToasts.exportCompleted('DXF'), 2000)
                  }}
                >
                  Export DXF
                </Button>
              </CardContent>
            </Card>

            {/* Project Toasts */}
            <Card variant="glass" className="border-2 border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Project Toasts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => projectToasts.created('M25 Bridge Widening')}
                >
                  Project Created
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => projectToasts.updated('M25 Bridge Widening')}
                >
                  Project Updated
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => projectToasts.archived('M25 Bridge Widening')}
                >
                  Project Archived
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => projectToasts.deleted('M25 Bridge Widening')}
                >
                  Project Deleted
                </Button>
              </CardContent>
            </Card>

            {/* Promise Toast */}
            <Card variant="glass" className="border-2 border-white/10 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">Promise Toast</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="neon"
                  className="w-full cyber-glow-purple"
                  onClick={() => {
                    toast.promise(demoPromise(), {
                      loading: 'Running calculation...',
                      success: 'Calculation completed successfully!',
                      error: 'Calculation failed'
                    })
                  }}
                >
                  <FiZap className="mr-2" />
                  Trigger Promise Toast (2s delay)
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ToastDemo
