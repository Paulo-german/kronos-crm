import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { Card, CardContent, CardHeader } from '@/_components/ui/card'
import { formatCurrency } from '@/_utils/format-currency'
import { formatVariation } from '@/_utils/date-range'
import type { TeamMemberPerformance } from '@/_data-access/reports/team/get-team-performance'
import type { TeamMemberBasicInfo } from '@/_data-access/reports/team/get-team-member-by-id'
import type { TeamMemberTaskBreakdownItem } from '@/_data-access/reports/team/get-team-member-task-breakdown'
import { MetricCard } from './metric-card'
import { TeamMemberTaskBreakdownList } from './team-member-task-breakdown-list'
import { getInitials } from './get-initials'

interface MemberSpotlightProps {
  member: TeamMemberPerformance | null
  basicInfo: TeamMemberBasicInfo | null
  taskBreakdown: TeamMemberTaskBreakdownItem[]
}

export function MemberSpotlight({ member, basicInfo, taskBreakdown }: MemberSpotlightProps) {
  if (!member && !basicInfo) return null

  const displayName = member?.fullName ?? basicInfo?.fullName ?? ''
  const displayAvatar = member?.avatarUrl ?? basicInfo?.avatarUrl ?? undefined
  const hasActivity = member !== null

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={displayAvatar} alt={displayName} />
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold leading-none">{displayName}</p>
              {!hasActivity && (
                <Badge variant="outline" className="ml-2">
                  Sem atividade no período
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Análise individual no período selecionado
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <MetricCard
            title="Deals Ganhos"
            value={hasActivity ? String(member.dealsWonCount) : '0'}
            variation={
              hasActivity
                ? formatVariation(member.dealsWonCount, member.prevDealsWonCount)
                : undefined
            }
          />
          <MetricCard
            title="Receita"
            value={hasActivity ? formatCurrency(member.revenue) : formatCurrency(0)}
            variation={
              hasActivity ? formatVariation(member.revenue, member.prevRevenue) : undefined
            }
          />
          <MetricCard
            title="Ticket Médio"
            value={hasActivity ? formatCurrency(member.avgTicket) : formatCurrency(0)}
            variation={
              hasActivity ? formatVariation(member.avgTicket, member.prevAvgTicket) : undefined
            }
          />
          <MetricCard
            title="Conversão"
            value={hasActivity ? `${member.conversionRate.toFixed(1)}%` : '0,0%'}
            variation={
              hasActivity
                ? formatVariation(member.conversionRate, member.prevConversionRate)
                : undefined
            }
          />
          <MetricCard
            title="Deals Perdidos"
            value={hasActivity ? String(member.dealsLostCount) : '0'}
            variation={
              hasActivity
                ? formatVariation(member.dealsLostCount, member.prevDealsLostCount)
                : undefined
            }
            invertPolarity
          />
          <MetricCard
            title="Pipeline Ativo"
            value={hasActivity ? formatCurrency(member.openPipelineValue) : formatCurrency(0)}
            footnote={
              hasActivity ? `${member.openDealsCount} deal(s) em aberto` : '0 deals em aberto'
            }
          />
        </div>

        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold">Tarefas concluídas no período</h3>
          <TeamMemberTaskBreakdownList items={taskBreakdown} />
        </div>
      </CardContent>
    </Card>
  )
}
