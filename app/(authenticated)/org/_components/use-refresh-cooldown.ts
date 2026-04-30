'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  REFRESH_COOLDOWN_MS,
  refreshCooldownStorageKey,
} from '@/_lib/billing/refresh-cache-constants'

interface UseRefreshCooldownResult {
  secondsRemaining: number
  isCoolingDown: boolean
  start: () => void
}

// Hook que persiste o estado de cooldown no localStorage para sobreviver
// à navegação entre /plans e /checkout sem reiniciar a contagem.
export function useRefreshCooldown(orgSlug: string): UseRefreshCooldownResult {
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  // Lê o localStorage na montagem para restaurar cooldown ativo
  useEffect(() => {
    // SSR guard: localStorage só existe no navegador
    if (typeof window === 'undefined') return

    const storageKey = refreshCooldownStorageKey(orgSlug)
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      const expiresAt = parseInt(stored, 10)
      const remaining = Math.ceil((expiresAt - Date.now()) / 1000)

      if (remaining > 0) {
        setSecondsRemaining(remaining)
      } else {
        localStorage.removeItem(storageKey)
      }
    }
  }, [orgSlug])

  // Tick a cada segundo enquanto em cooldown
  useEffect(() => {
    if (secondsRemaining <= 0) return

    const intervalId = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1

        // Quando zera, remove a chave do storage
        if (next <= 0 && typeof window !== 'undefined') {
          localStorage.removeItem(refreshCooldownStorageKey(orgSlug))
          return 0
        }

        return next
      })
    }, 1_000)

    // Cleanup obrigatório para evitar memory leak no unmount
    return () => clearInterval(intervalId)
  }, [secondsRemaining, orgSlug])

  const start = useCallback(() => {
    if (typeof window === 'undefined') return

    const expiresAt = Date.now() + REFRESH_COOLDOWN_MS
    localStorage.setItem(refreshCooldownStorageKey(orgSlug), String(expiresAt))
    setSecondsRemaining(Math.ceil(REFRESH_COOLDOWN_MS / 1_000))
  }, [orgSlug])

  return {
    secondsRemaining,
    isCoolingDown: secondsRemaining > 0,
    start,
  }
}
