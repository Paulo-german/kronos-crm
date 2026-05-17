import 'server-only'

import { parseDateRange } from '@/_utils/date-range'
import type { DealStatus, DealPriority } from '@prisma/client'
import type { ReportsFilters, DateRange } from './reports-types'

const VALID_STATUSES: DealStatus[] = ['OPEN', 'IN_PROGRESS', 'WON', 'LOST']
const VALID_PRIORITIES: DealPriority[] = ['low', 'medium', 'high', 'urgent']

export function parseReportsSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): { dateRange: DateRange; filters: ReportsFilters } {
  const start = typeof searchParams.start === 'string' ? searchParams.start : undefined
  const end = typeof searchParams.end === 'string' ? searchParams.end : undefined
  const dateRange = parseDateRange(start, end)

  const assignee =
    typeof searchParams.assignee === 'string' ? searchParams.assignee : undefined

  const pipelineId =
    typeof searchParams.pipelineId === 'string' ? searchParams.pipelineId : undefined

  const productId =
    typeof searchParams.productId === 'string' ? searchParams.productId : undefined

  const rawStatus = Array.isArray(searchParams.status)
    ? searchParams.status
    : searchParams.status
      ? [searchParams.status]
      : []
  const status = rawStatus.filter((value): value is DealStatus =>
    VALID_STATUSES.includes(value as DealStatus),
  )

  const rawPriority = Array.isArray(searchParams.priority)
    ? searchParams.priority
    : searchParams.priority
      ? [searchParams.priority]
      : []
  const priority = rawPriority.filter((value): value is DealPriority =>
    VALID_PRIORITIES.includes(value as DealPriority),
  )

  return {
    dateRange,
    filters: {
      ...(assignee && { assignee }),
      ...(pipelineId && { pipelineId }),
      ...(productId && { productId }),
      ...(status.length > 0 && { status }),
      ...(priority.length > 0 && { priority }),
    },
  }
}
