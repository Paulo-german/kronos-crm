import type { LifecycleCauseType, LifecycleStage } from '@prisma/client'

export interface LifecycleHistoryItemDto {
  id: string
  contactId: string
  contactName: string
  fromStage: LifecycleStage | null
  toStage: LifecycleStage
  causeType: LifecycleCauseType
  causeLabel: string
  changedByName: string | null
  createdAt: Date
}
