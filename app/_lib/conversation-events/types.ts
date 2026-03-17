// ---------------------------------------------------------------------------
// Event types — string unions independentes do Prisma
// ---------------------------------------------------------------------------

export type ConversationEventType =
  | 'TOOL_SUCCESS'
  | 'TOOL_FAILURE'
  | 'PROCESSING_ERROR'
  | 'INFO'

// ---------------------------------------------------------------------------
// Subtypes — validação apenas em TypeScript, não no banco
// ---------------------------------------------------------------------------

export type ToolSuccessSubtype =
  | 'DEAL_MOVED'
  | 'CONTACT_UPDATED'
  | 'DEAL_UPDATED'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'TASK_CREATED'
  | 'APPOINTMENT_CREATED'
  | 'EVENT_CREATED'
  | 'EVENT_RESCHEDULED'
  | 'AVAILABILITY_LISTED'
  | 'HAND_OFF_TO_HUMAN'
  | 'KNOWLEDGE_FOUND'

export type ToolFailureSubtype =
  | 'DEAL_MOVE_FAILED'
  | 'CONTACT_UPDATE_FAILED'
  | 'DEAL_UPDATE_FAILED'
  | 'TASK_CREATE_FAILED'
  | 'APPOINTMENT_CREATE_FAILED'
  | 'EVENT_CREATE_FAILED'
  | 'EVENT_RESCHEDULE_FAILED'

export type ProcessingErrorSubtype =
  | 'NO_CREDITS'
  | 'LLM_ERROR'
  | 'EMPTY_RESPONSE'

export type InfoSubtype = 'AI_PAUSED_DURING_GENERATION'

// ---------------------------------------------------------------------------
// Tool → Subtype mapping (apenas tools com failure real)
// ---------------------------------------------------------------------------

export const TOOL_SUBTYPE_MAP: Record<
  string,
  { success: ToolSuccessSubtype; failure: ToolFailureSubtype }
> = {
  move_deal: { success: 'DEAL_MOVED', failure: 'DEAL_MOVE_FAILED' },
  update_contact: { success: 'CONTACT_UPDATED', failure: 'CONTACT_UPDATE_FAILED' },
  update_deal: { success: 'DEAL_UPDATED', failure: 'DEAL_UPDATE_FAILED' },
  create_task: { success: 'TASK_CREATED', failure: 'TASK_CREATE_FAILED' },
  create_appointment: { success: 'APPOINTMENT_CREATED', failure: 'APPOINTMENT_CREATE_FAILED' },
  create_event: { success: 'EVENT_CREATED', failure: 'EVENT_CREATE_FAILED' },
  update_event: { success: 'EVENT_RESCHEDULED', failure: 'EVENT_RESCHEDULE_FAILED' },
}

// Tools que sempre resultam em success e têm subtype especial
export const ALWAYS_SUCCESS_TOOLS: Record<string, ToolSuccessSubtype> = {
  hand_off_to_human: 'HAND_OFF_TO_HUMAN',
  search_knowledge: 'KNOWLEDGE_FOUND',
  list_availability: 'AVAILABILITY_LISTED',
}

// ---------------------------------------------------------------------------
// DTO para API (compartilhado entre server e client)
// ---------------------------------------------------------------------------

export interface ConversationEventDto {
  id: string
  type: ConversationEventType
  toolName: string | null
  content: string
  metadata: Record<string, unknown> | null
  createdAt: Date | string
}
