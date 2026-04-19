import type { NormalizedWhatsAppMessage } from '@/_lib/evolution/types'
import type { GroupPromptContext } from './build-system-prompt'
import type { createExecutionTracker } from './lib/execution-tracker'

export type ExecutionTracker = ReturnType<typeof createExecutionTracker>

export interface DispatcherCtx {
  // Payload e identificadores
  message: NormalizedWhatsAppMessage
  conversationId: string
  organizationId: string
  effectiveAgentId: string
  agentVersion: 'v1' | 'v2' | 'v3'

  // Execução / rastreamento
  tracker: ExecutionTracker
  log: (step: string, outcome: string, extra?: Record<string, unknown>) => void
  baseLogContext: Record<string, unknown>
  taskStartMs: number
  traceTags: string[]
  finalizeTrace: (
    outcome: string,
    extra?: { metadata?: Record<string, unknown> },
  ) => void

  // Conteúdo pré-processado pelo prefácio
  messageText: string

  // Contexto de grupo (opcional)
  groupPromptContext?: GroupPromptContext
}
