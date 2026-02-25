import { task } from '@trigger.dev/sdk/v3'
import type { NormalizedWhatsAppMessage } from '@/_lib/evolution/types'

export interface ProcessAgentMessagePayload {
  message: NormalizedWhatsAppMessage
  agentId: string
  conversationId: string | null
  organizationId: string
}

export const processAgentMessage = task({
  id: 'process-agent-message',
  run: async (payload: ProcessAgentMessagePayload) => {
    // Fase 3 implementará o motor completo (debounce, LLM, tools, billing)
    console.log('[process-agent-message] Received payload:', {
      agentId: payload.agentId,
      conversationId: payload.conversationId,
      organizationId: payload.organizationId,
      messageId: payload.message.messageId,
      phoneNumber: payload.message.phoneNumber,
      type: payload.message.type,
      text: payload.message.text?.slice(0, 100),
    })

    return { success: true }
  },
})
