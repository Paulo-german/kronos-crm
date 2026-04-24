'use client'

import { useState, useEffect } from 'react'
import { getAgentStatusLabel } from '@/_lib/inbox/agent-status-labels'
import type { AgentStatusState, AgentStatusPayload } from '@/_lib/inbox/agent-status-types'

interface UseAgentStatusArgs {
  conversationId: string | null
  enabled?: boolean
  /** Função injetada pelo componente pai — vem de useAgentStatuses, sem subscription própria */
  getStatus: (id: string) => AgentStatusPayload | null
}

interface UseAgentStatusReturn {
  state: AgentStatusState
  agentName: string | null
  toolName: string | undefined
  label: string
  isActive: boolean
}

const IDLE_RETURN: UseAgentStatusReturn = {
  state: 'idle',
  agentName: null,
  toolName: undefined,
  label: '',
  isActive: false,
}

export function useAgentStatus({
  conversationId,
  enabled = true,
  getStatus,
}: UseAgentStatusArgs): UseAgentStatusReturn {
  const [hydratedPayload, setHydratedPayload] = useState<AgentStatusPayload | null>(null)

  // Re-hidratação inicial via API route para capturar execuções em andamento ao montar
  useEffect(() => {
    if (!enabled || !conversationId) {
      setHydratedPayload(null)
      return
    }

    let cancelled = false

    const hydrate = async () => {
      try {
        const response = await fetch(`/api/inbox/${conversationId}/agent-status`)
        const data = (await response.json()) as AgentStatusPayload
        if (!cancelled && data.state !== 'idle') {
          setHydratedPayload(data)
        }
      } catch {
        // Falha silenciosa — o Realtime vai compensar quando o próximo evento chegar
      }
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [conversationId, enabled])

  if (!enabled || !conversationId) return IDLE_RETURN

  // Prioridade: status em tempo real (Realtime) > payload hidratado na montagem
  const realtimeStatus = getStatus(conversationId)
  const activePayload = realtimeStatus ?? hydratedPayload

  if (!activePayload || activePayload.state === 'idle') return IDLE_RETURN

  const label = getAgentStatusLabel({
    state: activePayload.state,
    toolName: activePayload.toolName,
    agentName: activePayload.agentName,
  })

  return {
    state: activePayload.state,
    agentName: activePayload.agentName,
    toolName: activePayload.toolName,
    label,
    isActive: true,
  }
}
