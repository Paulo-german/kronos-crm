'use client'

import { usePathname } from 'next/navigation'
import { Check } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { CHECKOUT_STEPS } from './checkout-types'

export function CheckoutStepper() {
  const pathname = usePathname()

  const currentStepIndex = CHECKOUT_STEPS.findIndex((step) =>
    pathname.includes(step.path),
  )

  return (
    <nav aria-label="Etapas do checkout" className="flex items-center gap-2">
      {CHECKOUT_STEPS.map((step, index) => {
        const isCompleted = index < currentStepIndex
        const isCurrent = index === currentStepIndex
        const isFuture = index > currentStepIndex

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  isCompleted &&
                    'border-primary bg-primary text-primary-foreground',
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

            {index < CHECKOUT_STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-px w-8 sm:w-12',
                  index < currentStepIndex ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
