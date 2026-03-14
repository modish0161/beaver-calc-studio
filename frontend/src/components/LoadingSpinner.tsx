import { motion } from 'framer-motion'
import React from 'react'
import { cn } from '../lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'three-body' | 'pulse' | 'dots'
  text?: string
  fullscreen?: boolean
  className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  variant = 'three-body',
  text,
  fullscreen = false,
  className 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const containerClass = cn(
    "flex flex-col items-center justify-center space-y-4",
    fullscreen && "fixed inset-0 z-[100] bg-[#0a0a0f]/90 backdrop-blur-xl",
    className
  )

  const renderLoader = () => {
    switch (variant) {
      case 'three-body':
        return (
          <div className={cn("three-body", sizeClasses[size])}>
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
          </div>
        )
      
      case 'pulse':
        return (
          <motion.div
            className={cn(
              "rounded-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink",
              sizeClasses[size]
            )}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )
      
      case 'dots':
        return (
          <div className="flex items-center space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-neon-cyan"
                animate={{
                  y: ["0%", "-50%", "0%"],
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        )
      
      default:
        return (
          <div className={cn("relative", sizeClasses[size])}>
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-neon-cyan/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-neon-cyan"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )
    }
  }

  return (
    <div className={containerClass}>
      {renderLoader()}
      {text && (
        <motion.p
          className="text-white text-sm md:text-base font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

export default LoadingSpinner
