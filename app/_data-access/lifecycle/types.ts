import type {
  CustomerStatus,
  LifecycleCauseType,
  LifecycleStage,
} from '@prisma/client'

export interface LifecycleHistoryItemDto {
  id: string
  contactId: string
  contactName: string
  fromStage: LifecycleStage | null
  toStage: LifecycleStage
  fromStatus: CustomerStatus | null
  toStatus: CustomerStatus | null
  causeType: LifecycleCauseType
  causeLabel: string
  changedByName: string | null
  createdAt: Date
}
