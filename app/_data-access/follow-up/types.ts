export type ExhaustedAction = 'NONE' | 'NOTIFY_HUMAN' | 'MOVE_DEAL_STAGE'

export interface ExhaustedConfig {
  // Para MOVE_DEAL_STAGE: ID do stage de destino
  targetStageId?: string
  // Para NOTIFY_HUMAN: a quem notificar
  notifyTarget?: 'deal_assignee' | 'specific_number'
  // Para NOTIFY_HUMAN com specific_number: o numero de destino
  specificPhone?: string
}

export interface FollowUpDto {
  id: string
  agentId: string
  organizationId: string
  delayMinutes: number
  messageContent: string
  order: number
  isActive: boolean
  agentStepIds: string[]
  createdAt: Date
  updatedAt: Date
}
