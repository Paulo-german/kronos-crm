'use client'

import { ExecutionStepCard } from './execution-step-card'
import type { AgentExecutionStepDto } from '@/_data-access/agent-execution/get-agent-execution-by-id'

interface ExecutionTimelineProps {
  steps: AgentExecutionStepDto[]
}

export function ExecutionTimeline({ steps }: ExecutionTimelineProps) {
  if (steps.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground text-center">
        Nenhum step registrado para esta execução.
      </p>
    )
  }

  // Steps já chegam ordenados por `order` do data-access
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order)

  return (
    <div className="relative">
      {/* Linha vertical conectora da timeline */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />

      <div className="space-y-3">
        {sortedSteps.map((step) => (
          <ExecutionStepCard key={step.id} step={step} />
        ))}
      </div>
    </div>
  )
}
