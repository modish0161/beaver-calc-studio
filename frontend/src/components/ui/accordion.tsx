import { ChevronDown } from "lucide-react"
import * as React from "react"

import { cn } from "../../lib/utils"

interface AccordionContextValue {
  openItems: Set<string>
  toggle: (value: string) => void
  type: "single" | "multiple"
}

const AccordionContext = React.createContext<AccordionContextValue>({
  openItems: new Set(),
  toggle: () => {},
  type: "single",
})

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  collapsible?: boolean
}

function Accordion({
  type = "single",
  defaultValue,
  className,
  children,
  ...props
}: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(() => {
    if (!defaultValue) return new Set()
    return new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue])
  })

  const toggle = React.useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev)
        if (next.has(value)) {
          next.delete(value)
        } else {
          if (type === "single") next.clear()
          next.add(value)
        }
        return next
      })
    },
    [type]
  )

  return (
    <AccordionContext.Provider value={{ openItems, toggle, type }}>
      <div className={cn("space-y-0", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

const AccordionItemContext = React.createContext<string>("")

function AccordionItem({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  return (
    <AccordionItemContext.Provider value={value}>
      <div className={cn("border-b", className)} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { openItems, toggle } = React.useContext(AccordionContext)
  const value = React.useContext(AccordionItemContext)
  const isOpen = openItems.has(value)
  const stateProps = {
    "aria-expanded": isOpen ? ("true" as const) : ("false" as const),
    "data-state": isOpen ? "open" : "closed",
  }

  return (
    <h3 className="flex">
      <button
        ref={ref}
        type="button"
        onClick={() => toggle(value)}
        {...stateProps}
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      </button>
    </h3>
  )
})
AccordionTrigger.displayName = "AccordionTrigger"

function AccordionContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { openItems } = React.useContext(AccordionContext)
  const value = React.useContext(AccordionItemContext)
  const isOpen = openItems.has(value)

  if (!isOpen) return null

  return (
    <div
      className={cn("overflow-hidden text-sm transition-all", className)}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }

