import type { DateRange } from '@/_data-access/dashboard/types'
import type { DealStatus, DealPriority } from '@prisma/client'

export type { DateRange }

export interface ReportsFilters {
  pipelineId?: string
  assignee?: string
  status?: DealStatus[]
  priority?: DealPriority[]
  productId?: string
}
