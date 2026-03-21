'use client'

import { useEffect, useRef } from 'react'
import type { DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { runTour } from '@/_lib/onboarding/tours/tour-utils'

const COMPLETED_PREFIX = 'kronos-tour'

interface PageTourTriggerProps {
  tourId: string
  steps: DriveStep[]
  delay?: number
}

/**
 * Componente reutilizavel que dispara um mini-tour na primeira visita a uma pagina.
 * Renderiza null — efeito puro.
 *
 * Uso: <PageTourTrigger tourId="deals" steps={DEALS_TOUR_STEPS} />
 */
export function PageTourTrigger({
  tourId,
  steps,
  delay = 800,
}: PageTourTriggerProps) {
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (hasTriggered.current) return

    const completedKey = `${COMPLETED_PREFIX}-${tourId}-completed`
    if (localStorage.getItem(completedKey) === 'true') return

    hasTriggered.current = true

    const timeout = setTimeout(() => {
      void runTour(tourId, steps)
    }, delay)

    return () => clearTimeout(timeout)
  }, [tourId, steps, delay])

  return null
}
