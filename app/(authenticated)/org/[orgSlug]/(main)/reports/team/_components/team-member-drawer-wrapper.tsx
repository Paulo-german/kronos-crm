'use client'

import { useQueryStates } from 'nuqs'
import type { TeamMemberPerformance } from '@/_data-access/reports/team/get-team-performance'
import type { TeamMemberBasicInfo } from '@/_data-access/reports/team/get-team-member-by-id'
import type { TeamMemberTaskBreakdownItem } from '@/_data-access/reports/team/get-team-member-task-breakdown'
import { TeamMemberDrawer } from './team-member-drawer'
import { memberQueryParsers } from './member-query-parsers'

interface TeamMemberDrawerWrapperProps {
  member: TeamMemberPerformance | null
  basicInfo: TeamMemberBasicInfo | null
  taskBreakdown: TeamMemberTaskBreakdownItem[]
}

export function TeamMemberDrawerWrapper({
  member,
  basicInfo,
  taskBreakdown,
}: TeamMemberDrawerWrapperProps) {
  const [, setMemberQuery] = useQueryStates(memberQueryParsers)

  return (
    <TeamMemberDrawer
      member={member}
      basicInfo={basicInfo}
      taskBreakdown={taskBreakdown}
      open
      onClose={() => void setMemberQuery({ member: null })}
    />
  )
}
