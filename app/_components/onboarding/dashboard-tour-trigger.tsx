'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import 'driver.js/dist/driver.css'
import { DASHBOARD_TOUR_STEPS } from '@/_lib/onboarding/dashboard-tour'

const STORAGE_KEY = 'kronos-dashboard-tour-completed'

export function DashboardTourTrigger() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (hasTriggered.current) return
    if (searchParams.get('from') !== 'onboarding') return
    if (localStorage.getItem(STORAGE_KEY) === 'true') return

    hasTriggered.current = true

    // Limpa o param da URL
    const params = new URLSearchParams(searchParams.toString())
    params.delete('from')
    const cleanUrl = params.size > 0 ? `${pathname}?${params}` : pathname
    router.replace(cleanUrl)

    const timeout = setTimeout(async () => {
      const { driver } = await import('driver.js')

      // Filtra steps cujo elemento DOM existe
      const validSteps = DASHBOARD_TOUR_STEPS.filter((step) => {
        if (!step.element) return true
        return document.querySelector(step.element as string) !== null
      })

      if (validSteps.length === 0) return

      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        nextBtnText: 'Próximo',
        prevBtnText: 'Anterior',
        doneBtnText: 'Finalizar',
        progressText: '{{current}} de {{total}}',
        steps: validSteps,
        onDestroyStarted: () => {
          localStorage.setItem(STORAGE_KEY, 'true')
          driverObj.destroy()
        },
      })

      driverObj.drive()
    }, 800)

    return () => clearTimeout(timeout)
  }, [searchParams, router, pathname])

  return null
}
