'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
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
import { TeamMemberDrawer } from './team-member-drawer'

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function TeamRankingTable({ data }: TeamRankingTableProps) {
  const [selectedMember, setSelectedMember] = useState<TeamMemberPerformance | null>(null)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
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
            data.map((member, index) => (
              <TableRow
                key={member.userId}
                className="cursor-pointer"
                onClick={() => setSelectedMember(member)}
              >
                <TableCell className="font-medium text-muted-foreground">
                  #{index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={member.avatarUrl ?? undefined} alt={member.fullName} />
                      <AvatarFallback className="text-xs">{getInitials(member.fullName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.fullName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span>{member.dealsWonCount}</span>
                  <VariationBadge current={member.dealsWonCount} previous={member.prevDealsWonCount} />
                </TableCell>
                <TableCell className="text-right">
                  <span>{formatCurrency(member.revenue)}</span>
                  <VariationBadge current={member.revenue} previous={member.prevRevenue} />
                </TableCell>
                <TableCell className="text-right">
                  <span>{formatCurrency(member.avgTicket)}</span>
                  <VariationBadge current={member.avgTicket} previous={member.prevAvgTicket} />
                </TableCell>
                <TableCell className="text-right">
                  <span>{member.conversionRate.toFixed(1)}%</span>
                  <VariationBadge current={member.conversionRate} previous={member.prevConversionRate} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <TeamMemberDrawer
        member={selectedMember}
        open={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
      />
    </>
  )
}
