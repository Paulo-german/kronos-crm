import 'server-only'

import { CatalogItemType } from '@prisma/client'
import { SIMULATOR_CONTACT_PHONE } from '@/_lib/simulator'
import type { ReportsFilters } from './reports-types'

interface BuildReportsWhereOptions {
  ignoreStatus?: boolean
}

export function buildReportsWhere(
  orgId: string,
  userId: string,
  elevated: boolean,
  filters: ReportsFilters,
  options?: BuildReportsWhereOptions,
) {
  return {
    organizationId: orgId,
    contacts: { none: { contact: { phone: SIMULATOR_CONTACT_PHONE } } },
    ...(elevated && filters.assignee
      ? { assignedTo: filters.assignee }
      : elevated
        ? {}
        : { assignedTo: userId }),
    ...(filters.pipelineId ? { stage: { pipelineId: filters.pipelineId } } : {}),
    ...(!options?.ignoreStatus && filters.status && filters.status.length > 0
      ? { status: { in: filters.status } }
      : {}),
    ...(filters.priority && filters.priority.length > 0
      ? { priority: { in: filters.priority } }
      : {}),
    ...(filters.productId
      ? {
          lineItems: {
            some: { productId: filters.productId, itemType: CatalogItemType.PRODUCT },
          },
        }
      : {}),
  }
}
