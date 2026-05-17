'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { DateRangePicker } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/_components/date-range-picker'
import { AssigneeFilter } from './assignee-filter'
import type { MemberOption } from './assignee-filter'

const reportsGlobalParsers = {
  start: parseAsString.withOptions({ shallow: false }),
  end: parseAsString.withOptions({ shallow: false }),
  assignee: parseAsString.withOptions({ shallow: false }),
}

interface ReportsGlobalFiltersProps {
  isElevated: boolean
  members: MemberOption[] | null
}

export function ReportsGlobalFilters({ isElevated, members }: ReportsGlobalFiltersProps) {
  const [filters, setFilters] = useQueryStates(reportsGlobalParsers)

  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-4">
      <DateRangePicker />
      {isElevated && members ? (
        <AssigneeFilter
          members={members}
          value={filters.assignee}
          onChange={(value) => void setFilters({ assignee: value })}
        />
      ) : null}
    </div>
  )
}
