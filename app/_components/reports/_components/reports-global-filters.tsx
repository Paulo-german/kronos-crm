'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { DateRangePicker } from '@/_components/dashboard/_shared/date-range-picker'
import { AssigneeFilter } from './assignee-filter'
import type { MemberOption } from './assignee-filter'

// start/end são gerenciados exclusivamente pelo DateRangePicker (que tem seu
// próprio useQueryStates). Manter um segundo listener para os mesmos params aqui
// causava conflito de state updates — por isso só gerenciamos `assignee`.
const reportsGlobalParsers = {
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
