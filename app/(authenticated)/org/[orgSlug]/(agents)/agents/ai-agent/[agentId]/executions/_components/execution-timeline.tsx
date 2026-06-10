'use client'

import { ExecutionStepCard } from './execution-step-card'
import type { AgentExecutionStepDto } from '@/_data-access/agent-execution/get-agent-execution-by-id'

interface ExecutionTimelineProps {
  steps: AgentExecutionStepDto[]
}

export function ExecutionTimeline({ steps }: ExecutionTimelineProps) {
  if (steps.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhum step registrado para esta execução.
      </p>
    )
  }

  // Steps já chegam ordenados por `order` do data-access
  const sortedSteps = [...steps].sort(
    (stepA, stepB) => stepA.order - stepB.order,
  )

  return (
    <div className="relative">
      {/* Linha vertical conectora da timeline */}
      <div className="absolute bottom-3 left-[11px] top-3 w-px bg-border" />

      <div className="space-y-3">
        {sortedSteps.map((step) => (
          <ExecutionStepCard key={step.id} step={step} />
        ))}
      </div>
    </div>
  )
}
