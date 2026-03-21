'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

export function useOnboardingParams(initialStatus: OnboardingStatus) {
  // Valores default seguros para SSR (sem acesso a window)
  const computedInitialStep = !initialStatus.hasInbox ? 0 : 3

  const [step, setStepRaw] = useState(computedInitialStep)
  const [inboxId, setInboxIdRaw] = useState<string | null>(null)
  const [whatsappConnected, setWhatsappConnectedRaw] = useState(
    initialStatus.hasInbox,
  )
  const [configApproved, setConfigApprovedRaw] = useState(false)
  const [agentApproved, setAgentApprovedRaw] = useState(false)

  // Hidrata do URL params no client (uma vez, no mount)
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    const urlStep = readUrlParam('s')
    if (urlStep !== null) {
      const parsed = parseInt(urlStep, 10)
      if (!isNaN(parsed)) setStepRaw(Math.min(parsed, 4))
    }

    const urlInboxId = readUrlParam('iid')
    if (urlInboxId) setInboxIdRaw(urlInboxId)

    const urlWc = readUrlParam('wc')
    if (urlWc === 'true') setWhatsappConnectedRaw(true)

    const urlCa = readUrlParam('ca')
    if (urlCa === 'true') setConfigApprovedRaw(true)

    const urlAa = readUrlParam('aa')
    if (urlAa === 'true') setAgentApprovedRaw(true)
  }, [])

  // Sync state → URL
  useEffect(() => {
    if (!hydratedRef.current) return
    syncToUrl({
      s: String(step),
      iid: inboxId,
      wc: whatsappConnected ? 'true' : null,
      ca: configApproved ? 'true' : null,
      aa: agentApproved ? 'true' : null,
    })
  }, [step, inboxId, whatsappConnected, configApproved, agentApproved])

  const setStep = useCallback((value: number) => setStepRaw(value), [])
  const setInboxId = useCallback((value: string) => setInboxIdRaw(value), [])
  const setWhatsappConnected = useCallback(
    (value: boolean) => setWhatsappConnectedRaw(value),
    [],
  )
  const setConfigApproved = useCallback(
    (value: boolean) => setConfigApprovedRaw(value),
    [],
  )
  const setAgentApproved = useCallback(
    (value: boolean) => setAgentApprovedRaw(value),
    [],
  )

  return {
    step,
    setStep,
    inboxId,
    setInboxId,
    whatsappConnected,
    setWhatsappConnected,
    configApproved,
    setConfigApproved,
    agentApproved,
    setAgentApproved,
  }
}
