import * as React from "react"

import { cn } from "../../lib/utils"

interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: number[]
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number[]) => void
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value = [0], min = 0, max = 100, step = 1, onValueChange, ...props }, ref) => {
    const percentage = ((value[0] - min) / (max - min)) * 100

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange?.([Number(e.target.value)])
    }

    return (
      <div
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
      >
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute h-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Slider"
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
