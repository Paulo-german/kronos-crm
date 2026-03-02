'use client'

import { Check } from 'lucide-react'
import { cn } from '@/_lib/utils'

const IMPORT_STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'mapping', label: 'Mapeamento' },
  { id: 'preview', label: 'Confirmar' },
] as const

interface ImportStepperProps {
  currentStep: number
}

export function ImportStepper({ currentStep }: ImportStepperProps) {
  return (
    <nav aria-label="Etapas da importação" className="flex items-center justify-center gap-2">
      {IMPORT_STEPS.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isFuture = index > currentStep

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary text-primary',
                  isFuture && 'border-muted-foreground/30 text-muted-foreground/50',
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  isCurrent && 'text-foreground',
                  isCompleted && 'text-foreground',
                  isFuture && 'text-muted-foreground/50',
                )}
              >
                {step.label}
              </span>
            </div>

            {index < IMPORT_STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-px w-8 sm:w-12',
                  index < currentStep ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
