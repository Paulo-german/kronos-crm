import { supabaseAdmin } from '@/_lib/supabase/admin'
import { AGENT_STATUS_EVENT, orgAgentStatusChannelName, type AgentStatusPayload } from './agent-status-types'

/**
 * Broadcast de status do agente via Supabase Realtime.
 * Sem dependência do Trigger.dev — pode ser chamado de qualquer contexto (webhooks, workers, etc).
 * Nunca lança — falha de observabilidade não pode derrubar o chamador.
 */
export async function broadcastAgentStatus(payload: AgentStatusPayload): Promise<'ok' | 'failed'> {
  let channel: ReturnType<typeof supabaseAdmin.channel> | null = null
  try {
    channel = supabaseAdmin.channel(orgAgentStatusChannelName(payload.organizationId))
    const response = await channel.send({
      type: 'broadcast',
      event: AGENT_STATUS_EVENT,
      payload,
    })
    return response === 'ok' ? 'ok' : 'failed'
  } catch {
    return 'failed'
  } finally {
    if (channel) await supabaseAdmin.removeChannel(channel)
  }
}
