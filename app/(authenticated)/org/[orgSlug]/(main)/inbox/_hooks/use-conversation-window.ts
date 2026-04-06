'use client'

import { useState, useEffect } from 'react'
import {
  isConversationWindowOpen,
  getWindowExpiresAt,
} from '@/_lib/whatsapp/conversation-window'

export interface ConversationWindowState {
  /** Se a janela de 24h está aberta (permite texto livre) */
  isOpen: boolean
  /** Se a janela está prestes a expirar (<= 60 min restantes) */
  isExpiring: boolean
  /** Minutos restantes (null se janela fechada ou não-Meta) */
  minutesRemaining: number | null
  /** Texto formatado do tempo restante: "23h 45min", "45 min", "< 1 min" */
  formattedTimeRemaining: string | null
  /** Data de expiração */
  expiresAt: Date | null
  /** Se esse cálculo é relevante (só Meta Cloud) */
  isMetaCloud: boolean
}

const MINUTE_MS = 60_000
const EXPIRING_THRESHOLD_MINUTES = 60

function formatTimeRemaining(minutes: number): string {
  if (minutes <= 1) return '< 1 min'
  if (minutes <= EXPIRING_THRESHOLD_MINUTES) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}min`
}

function computeWindowState(
  lastCustomerMessageAt: Date | null,
  connectionType: string,
): ConversationWindowState {
  // Early return para provedores que não têm restrição de janela
  if (connectionType !== 'META_CLOUD') {
    return {
      isOpen: true,
      isExpiring: false,
      minutesRemaining: null,
      formattedTimeRemaining: null,
      expiresAt: null,
      isMetaCloud: false,
    }
  }

  const isOpen = isConversationWindowOpen(lastCustomerMessageAt)
  const expiresAt = getWindowExpiresAt(lastCustomerMessageAt)

  if (!isOpen) {
    return {
      isOpen: false,
      isExpiring: false,
      minutesRemaining: null,
      formattedTimeRemaining: null,
      expiresAt,
      isMetaCloud: true,
    }
  }

  if (!expiresAt) {
    return {
      isOpen: true,
      isExpiring: false,
      minutesRemaining: null,
      formattedTimeRemaining: null,
      expiresAt: null,
      isMetaCloud: true,
    }
  }

  const msRemaining = expiresAt.getTime() - Date.now()
  const minutesRemaining = Math.ceil(msRemaining / MINUTE_MS)
  const isExpiring = minutesRemaining <= EXPIRING_THRESHOLD_MINUTES

  return {
    isOpen: true,
    isExpiring,
    minutesRemaining,
    formattedTimeRemaining: formatTimeRemaining(minutesRemaining),
    expiresAt,
    isMetaCloud: true,
  }
}

/**
 * Hook que encapsula a lógica reativa da janela de conversa WhatsApp de 24h.
 * Atualiza o estado a cada minuto para refletir o tempo restante em tempo real.
 *
 * Justificativa do useEffect: sincronização com sistema externo (relógio).
 * O setInterval mantém o estado do componente em sincronia com o avanço do tempo.
 */
export function useConversationWindow(
  lastCustomerMessageAt: Date | null,
  connectionType: string,
): ConversationWindowState {
  const [windowState, setWindowState] = useState<ConversationWindowState>(() =>
    computeWindowState(lastCustomerMessageAt, connectionType),
  )

  // Recalcula imediatamente quando lastCustomerMessageAt muda (nova msg do cliente via polling)
  useEffect(() => {
    setWindowState(computeWindowState(lastCustomerMessageAt, connectionType))
  }, [lastCustomerMessageAt, connectionType])

  // Atualiza a cada minuto para countdown reativo (sync com relógio — sistema externo)
  useEffect(() => {
    if (connectionType !== 'META_CLOUD') return

    const interval = setInterval(() => {
      setWindowState(computeWindowState(lastCustomerMessageAt, connectionType))
    }, MINUTE_MS)

    return () => clearInterval(interval)
  }, [lastCustomerMessageAt, connectionType])

  return windowState
}
