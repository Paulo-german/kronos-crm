export type AgentStatusState =
  | 'thinking'
  | 'running_tool'
  | 'composing'
  | 'idle'

export interface AgentStatusPayload {
  conversationId: string
  organizationId: string
  state: AgentStatusState
  agentName: string
  toolName?: string
  updatedAt: string
  terminalReason?: 'completed' | 'skipped' | 'failed'
}

export const AGENT_STATUS_TTL_MS = 60_000

export function orgAgentStatusChannelName(orgId: string): string {
  return `org:${orgId}:agent-status`
}

export const AGENT_STATUS_EVENT = 'agent-status'
