'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/_lib/supabase/client'
import {
  AGENT_STATUS_EVENT,
  AGENT_STATUS_TTL_MS,
  orgAgentStatusChannelName,
  type AgentStatusPayload,
} from '@/_lib/inbox/agent-status-types'

interface UseAgentStatusesReturn {
  isConversationActive: (conversationId: string) => boolean
  getStatus: (conversationId: string) => AgentStatusPayload | null
}

export function useAgentStatuses(orgId: string): UseAgentStatusesReturn {
  const [statusMap, setStatusMap] = useState<Map<string, AgentStatusPayload>>(new Map())
  const supabase = useRef(createClient())

  // Subscribe ao canal de status de agente da org
  useEffect(() => {
    if (!orgId) return

    // Captura o client no momento do effect para que o cleanup use a mesma instância
    const client = supabase.current
    const channelName = orgAgentStatusChannelName(orgId)
    const channel = client.channel(channelName)

    channel
      .on('broadcast', { event: AGENT_STATUS_EVENT }, ({ payload }) => {
        const data = payload as AgentStatusPayload
        setStatusMap((prev) => {
          const next = new Map(prev)
          if (data.state === 'idle') {
            next.delete(data.conversationId)
          } else {
            next.set(data.conversationId, data)
          }
          return next
        })
      })
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [orgId])

  // Varredura periódica: remove entradas que ultrapassaram o TTL
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setStatusMap((prev) => {
        let changed = false
        const next = new Map(prev)
        for (const [conversationId, entry] of next) {
          if (now - new Date(entry.updatedAt).getTime() > AGENT_STATUS_TTL_MS) {
            next.delete(conversationId)
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 5_000)

    return () => clearInterval(interval)
  }, [])

  const isConversationActive = useCallback(
    (conversationId: string) => statusMap.has(conversationId),
    [statusMap],
  )

  const getStatus = useCallback(
    (conversationId: string) => statusMap.get(conversationId) ?? null,
    [statusMap],
  )

  return { isConversationActive, getStatus }
}
