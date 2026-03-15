'use client'

import { useState, useEffect, useCallback } from 'react'
import type { OnboardingStatus } from '@/_data-access/organization/get-onboarding-status'

function readUrlParam(key: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(key)
}

function syncToUrl(params: Record<string, string | null>) {
  const url = new URL(window.location.href)
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value)
    } else {
      url.searchParams.delete(key)
    }
  }
  window.history.replaceState({}, '', url)
}

function computeMaxValidStep(
  niche: string | null,
): number {
  if (!niche) return 0
  return 3
}

export function useOnboardingParams(initialStatus: OnboardingStatus) {
  const computedInitialStep = !initialStatus.niche
    ? 0
    : !initialStatus.hasInbox
      ? 1
      : 2

  const [stepRaw, setStepRaw] = useState(() => {
    const urlVal = readUrlParam('s')
    if (urlVal !== null) {
      const parsed = parseInt(urlVal, 10)
      if (!isNaN(parsed)) return parsed
    }
    return computedInitialStep
  })

  const [niche, setNicheRaw] = useState<string | null>(
    () => readUrlParam('n') || initialStatus.niche,
  )

  const [inboxId, setInboxIdRaw] = useState<string | null>(
    () => readUrlParam('iid') || null,
  )

  const [whatsappConnected, setWhatsappConnectedRaw] = useState(() => {
    const urlVal = readUrlParam('wc')
    if (urlVal === 'true') return true
    if (urlVal === 'false') return false
    return initialStatus.hasInbox
  })

  // Sync state → URL
  useEffect(() => {
    syncToUrl({
      s: String(stepRaw),
      n: niche,
      iid: inboxId,
      wc: whatsappConnected ? 'true' : null,
    })
  }, [stepRaw, niche, inboxId, whatsappConnected])

  const maxValidStep = computeMaxValidStep(niche)

  const step = Math.min(stepRaw, maxValidStep)

  const setStep = useCallback((value: number) => setStepRaw(value), [])
  const setNiche = useCallback((value: string) => setNicheRaw(value), [])
  const setInboxId = useCallback((value: string) => setInboxIdRaw(value), [])
  const setWhatsappConnected = useCallback(
    (value: boolean) => setWhatsappConnectedRaw(value),
    [],
  )

  return {
    step,
    setStep,
    niche,
    setNiche,
    inboxId,
    setInboxId,
    whatsappConnected,
    setWhatsappConnected,
  }
}
