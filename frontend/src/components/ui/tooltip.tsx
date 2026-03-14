import * as React from "react"

import { cn } from "../../lib/utils"

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  return (
    <TooltipContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-flex">{children}</div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const ctx = React.useContext(TooltipContext)
  return (
    <button
      ref={ref}
      type="button"
      className={cn("inline-flex", className)}
      onMouseEnter={() => ctx?.setOpen(true)}
      onMouseLeave={() => ctx?.setOpen(false)}
      onFocus={() => ctx?.setOpen(true)}
      onBlur={() => ctx?.setOpen(false)}
      {...props}
    />
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right"
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = "top", ...props }, ref) => {
    const ctx = React.useContext(TooltipContext)
    if (!ctx?.open) return null

    const sideClasses = {
      top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
      bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
      left: "right-full top-1/2 -translate-y-1/2 mr-2",
      right: "left-full top-1/2 -translate-y-1/2 ml-2",
    }

    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          sideClasses[side],
          className
        )}
        {...props}
      />
    )
  }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }

