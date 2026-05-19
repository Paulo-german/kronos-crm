'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/_components/ui/sheet'
import { formatCurrency } from '@/_utils/format-currency'
import { formatVariation } from '@/_utils/date-range'
import type { TeamMemberPerformance } from '@/_data-access/reports/team/get-team-performance'
import type { TeamMemberBasicInfo } from '@/_data-access/reports/team/get-team-member-by-id'
import type { TeamMemberTaskBreakdownItem } from '@/_data-access/reports/team/get-team-member-task-breakdown'
import { MetricCard } from './metric-card'
import { TeamMemberTaskBreakdownList } from './team-member-task-breakdown-list'
import { getInitials } from './get-initials'

export interface TeamMemberDrawerProps {
  member: TeamMemberPerformance | null
  basicInfo: TeamMemberBasicInfo | null
  taskBreakdown: TeamMemberTaskBreakdownItem[]
  open: boolean
  onClose: () => void
}

export function TeamMemberDrawer({
  member,
  basicInfo,
  taskBreakdown,
  open,
  onClose,
}: TeamMemberDrawerProps) {
  const displayName = member?.fullName ?? basicInfo?.fullName ?? ''
  const displayAvatar = member?.avatarUrl ?? basicInfo?.avatarUrl ?? undefined

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <SheetTitle className="text-base font-semibold">{displayName}</SheetTitle>
          </div>
        </SheetHeader>

        {member && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                title="Deals Ganhos"
                value={String(member.dealsWonCount)}
                variation={formatVariation(member.dealsWonCount, member.prevDealsWonCount)}
              />
              <MetricCard
                title="Receita"
                value={formatCurrency(member.revenue)}
                variation={formatVariation(member.revenue, member.prevRevenue)}
              />
              <MetricCard
                title="Ticket Médio"
                value={formatCurrency(member.avgTicket)}
                variation={formatVariation(member.avgTicket, member.prevAvgTicket)}
              />
              <MetricCard
                title="Conversão"
                value={`${member.conversionRate.toFixed(1)}%`}
                variation={formatVariation(member.conversionRate, member.prevConversionRate)}
              />
              <MetricCard
                title="Deals Perdidos"
                value={String(member.dealsLostCount)}
                variation={formatVariation(member.dealsLostCount, member.prevDealsLostCount)}
                invertPolarity
              />
              <MetricCard
                title="Pipeline Ativo"
                value={formatCurrency(member.openPipelineValue)}
                footnote={`${member.openDealsCount} deal(s) em aberto`}
              />
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold">Tarefas concluídas no período</h3>
              <TeamMemberTaskBreakdownList items={taskBreakdown} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
