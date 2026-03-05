export interface ToolContext {
  organizationId: string
  agentId: string
  agentName: string
  conversationId: string
  contactId: string
  dealId: string | null
  pipelineIds: string[]
}
