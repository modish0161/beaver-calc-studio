import React from 'react'
import { getFieldExplanation } from '../data/fieldExplanations'
import ExplainTooltip from './ExplainTooltip'

interface ExplainableLabelProps {
  /** The display text for the label */
  label: string
  /** The field key to look up in fieldExplanations */
  field: string
  /** Additional className for the label */
  className?: string
}

/**
 * A label element with an inline ExplainTooltip icon.
 * Automatically looks up Eurocode clause info from fieldExplanations.
 * If no explanation exists for the field, renders a plain label.
 */
const ExplainableLabel: React.FC<ExplainableLabelProps> = ({
  label,
  field,
  className = 'text-sm text-gray-400',
}) => {
  const explanation = getFieldExplanation(field)

  return (
    <div className="flex items-center gap-1.5">
      <label className={className}>{label}</label>
      {explanation && (
        <ExplainTooltip
          title={explanation.title}
          method={explanation.method}
          eurocodeClause={explanation.eurocodeClause}
          equation={explanation.equation}
          assumptions={explanation.assumptions}
          references={explanation.references}
          position="right"
        />
      )}
    </div>
  )
}

export default ExplainableLabel
