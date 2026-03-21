'use client'

import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/_lib/utils'

// Step 4 (celebracao) nao aparece no stepper
const ONBOARDING_STEPS = [
  { id: 'conversation', label: 'Seu Negócio' },
  { id: 'config', label: 'Configuração' },
  { id: 'agent', label: 'Agente IA' },
  { id: 'whatsapp', label: 'WhatsApp' },
] as const

interface OnboardingStepperProps {
  currentStep: number
}

export function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  return (
    <nav
      aria-label="Etapas do onboarding"
      className="flex items-center justify-center gap-2"
    >
      {ONBOARDING_STEPS.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isFuture = index > currentStep

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  isCompleted &&
                    'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary text-primary',
                  isFuture &&
                    'border-muted-foreground/30 text-muted-foreground/50',
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
                  'hidden text-sm font-medium sm:inline',
                  isCurrent && 'text-foreground',
                  isCompleted && 'text-foreground',
                  isFuture && 'text-muted-foreground/50',
                )}
              >
                {step.label}
              </span>
            </div>

            {index < ONBOARDING_STEPS.length - 1 && (
              <div className="relative mx-2 h-px w-6 bg-border sm:w-12">
                <motion.div
                  className="absolute inset-0 bg-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: index < currentStep ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ transformOrigin: 'left' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
