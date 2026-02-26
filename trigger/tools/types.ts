export interface ToolContext {
  organizationId: string
  agentId: string
  conversationId: string
  contactId: string
  dealId: string | null
  pipelineIds: string[]
}
