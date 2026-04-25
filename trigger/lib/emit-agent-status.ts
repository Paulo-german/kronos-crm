import { logger } from '@trigger.dev/sdk/v3'
import { broadcastAgentStatus } from '@/_lib/inbox/broadcast-agent-status'
import type { AgentStatusPayload, AgentStatusState } from '@/_lib/inbox/agent-status-types'

interface EmitArgs {
  conversationId: string
  organizationId: string
  state: AgentStatusState
  agentName?: string
  toolName?: string
  terminalReason?: AgentStatusPayload['terminalReason']
}

export async function emitAgentStatus(args: EmitArgs): Promise<void> {
  const result = await broadcastAgentStatus({
    conversationId: args.conversationId,
    organizationId: args.organizationId,
    state: args.state,
    agentName: args.agentName,
    toolName: args.toolName,
    updatedAt: new Date().toISOString(),
    terminalReason: args.terminalReason,
  })

  if (result === 'failed') {
    logger.warn('emitAgentStatus: broadcast failed', {
      conversationId: args.conversationId,
      organizationId: args.organizationId,
      state: args.state,
    })
    return
  }

  logger.info('emitAgentStatus: broadcast sent', {
    conversationId: args.conversationId,
    state: args.state,
    toolName: args.toolName,
    terminalReason: args.terminalReason,
  })
}
