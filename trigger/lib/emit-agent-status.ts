import { logger } from '@trigger.dev/sdk/v3'
import { supabaseAdmin } from '@/_lib/supabase/admin'
import {
  AGENT_STATUS_EVENT,
  orgAgentStatusChannelName,
  type AgentStatusPayload,
  type AgentStatusState,
} from '@/_lib/inbox/agent-status-types'

interface EmitArgs {
  conversationId: string
  organizationId: string
  state: AgentStatusState
  agentName: string
  toolName?: string
  terminalReason?: AgentStatusPayload['terminalReason']
}

export async function emitAgentStatus(args: EmitArgs): Promise<void> {
  const channel = supabaseAdmin.channel(orgAgentStatusChannelName(args.organizationId))

  try {
    const payload: AgentStatusPayload = {
      conversationId: args.conversationId,
      organizationId: args.organizationId,
      state: args.state,
      agentName: args.agentName,
      toolName: args.toolName,
      updatedAt: new Date().toISOString(),
      terminalReason: args.terminalReason,
    }

    // RealtimeChannelSendResponse é uma string: 'ok' | 'timed out' | 'rate limited' | 'error'
    const response = await channel.send({
      type: 'broadcast',
      event: AGENT_STATUS_EVENT,
      payload,
    })

    if (response !== 'ok') {
      logger.warn('emitAgentStatus: broadcast failed', {
        conversationId: args.conversationId,
        organizationId: args.organizationId,
        state: args.state,
        response,
      })
      return
    }

    logger.info('emitAgentStatus: broadcast sent', {
      conversationId: args.conversationId,
      state: args.state,
      toolName: args.toolName,
      terminalReason: args.terminalReason,
    })
  } catch (error) {
    // emitAgentStatus nunca lança — falha de observabilidade não pode derrubar o agente
    logger.warn('emitAgentStatus: unexpected error', {
      conversationId: args.conversationId,
      organizationId: args.organizationId,
      state: args.state,
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    // Cleanup do handle efêmero — evita leak de conexão WebSocket no worker
    await supabaseAdmin.removeChannel(channel)
  }
}
