'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { useQueryStates } from 'nuqs'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { cn } from '@/_lib/utils'
import { formatCurrency } from '@/_utils/format-currency'
import { formatVariation } from '@/_utils/date-range'
import type { TeamMemberPerformance } from '@/_data-access/reports/team/get-team-performance'
import { RankBadge } from './rank-badge'
import { getInitials } from './get-initials'
import { memberQueryParsers } from './member-query-parsers'

interface TeamRankingTableProps {
  data: TeamMemberPerformance[]
}

interface VariationBadgeProps {
  current: number
  previous: number
}

function VariationBadge({ current, previous }: VariationBadgeProps) {
  const variation = formatVariation(current, previous)
  if (!variation) return null

  return (
    <span
      className={cn(
        'ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
        variation.isPositive
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
      )}
    >
      {variation.isPositive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {variation.value}
    </span>
  )
}

export function TeamRankingTable({ data }: TeamRankingTableProps) {
  const [, setMemberQuery] = useQueryStates(memberQueryParsers)

  // Receita do líder (data já vem ordenada por revenue desc do data-access)
  const topRevenue = data[0]?.revenue ?? 0

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">Posição</TableHead>
          <TableHead>Membro</TableHead>
          <TableHead className="text-right">Deals ganhos</TableHead>
          <TableHead className="text-right">Receita</TableHead>
          <TableHead className="text-right">Ticket médio</TableHead>
          <TableHead className="text-right">Conversão</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
              Nenhum membro com atividade no período.
            </TableCell>
          </TableRow>
        ) : (
          data.map((member, index) => {
            const ratio = topRevenue > 0 ? Math.min(member.revenue / topRevenue, 1) : 0

            return (
              <TableRow
                key={member.userId}
                className="cursor-pointer"
                onClick={() => void setMemberQuery({ member: member.userId })}
              >
                <TableCell>
                  <RankBadge position={index + 1} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={member.avatarUrl ?? undefined} alt={member.fullName} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.fullName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span>{member.dealsWonCount}</span>
                  <VariationBadge
                    current={member.dealsWonCount}
                    previous={member.prevDealsWonCount}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div>
                    <span>{formatCurrency(member.revenue)}</span>
                    <VariationBadge current={member.revenue} previous={member.prevRevenue} />
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(ratio * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Receita relativa ao líder"
                    className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted/40"
                  >
                    <div
                      className={cn(
                        'h-full rounded-full',
                        ratio === 1 ? 'bg-emerald-500' : 'bg-primary/60',
                      )}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span>{formatCurrency(member.avgTicket)}</span>
                  <VariationBadge current={member.avgTicket} previous={member.prevAvgTicket} />
                </TableCell>
                <TableCell className="text-right">
                  <span>{member.conversionRate.toFixed(1)}%</span>
                  <VariationBadge
                    current={member.conversionRate}
                    previous={member.prevConversionRate}
                  />
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
