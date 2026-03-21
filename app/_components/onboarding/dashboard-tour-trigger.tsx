'use client'

import { useEffect, useRef } from 'react'
import 'driver.js/dist/driver.css'
import {
  shouldShowTour,
  runTour,
  markTourCompleted,
} from '@/_lib/onboarding/tours/tour-utils'
import {
  consumeMainTourContext,
  buildMainTourSteps,
} from '@/_lib/onboarding/tours/main-tour'

const TOUR_ID = 'main'

export function DashboardTourTrigger() {
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (hasTriggered.current) return
    if (!shouldShowTour(TOUR_ID)) return

    hasTriggered.current = true

    const timeout = setTimeout(() => {
      const context = consumeMainTourContext()

      if (!context) {
        markTourCompleted(TOUR_ID)
        return
      }

      const steps = buildMainTourSteps(context)
      void runTour(TOUR_ID, steps)
    }, 1200)

    return () => clearTimeout(timeout)
  }, [])

  return null
}
