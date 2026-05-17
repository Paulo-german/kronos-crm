'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/_components/ui/sheet'
import { cn } from '@/_lib/utils'
import { formatCurrency } from '@/_utils/format-currency'
import { formatVariation } from '@/_utils/date-range'
import type { TeamMemberPerformance } from '@/_data-access/reports/team/get-team-performance'

interface TeamMemberDrawerProps {
  member: TeamMemberPerformance | null
  open: boolean
  onClose: () => void
}

interface MetricCardProps {
  title: string
  value: string
  variation: ReturnType<typeof formatVariation>
}

function MetricCard({ title, value, variation }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-xl font-bold">{value}</p>
        {variation && (
          <span
            className={cn(
              'mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
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
        )}
      </CardContent>
    </Card>
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

export function TeamMemberDrawer({ member, open, onClose }: TeamMemberDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        {member && (
          <>
            <SheetHeader className="pb-6">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={member.avatarUrl ?? undefined} alt={member.fullName} />
                  <AvatarFallback>{getInitials(member.fullName)}</AvatarFallback>
                </Avatar>
                <SheetTitle className="text-base font-semibold">{member.fullName}</SheetTitle>
              </div>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
