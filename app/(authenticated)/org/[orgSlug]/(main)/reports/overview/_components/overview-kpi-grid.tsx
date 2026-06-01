'use client'

import { DollarSign, TrendingUp, TrendingDown, Target, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'
import { formatCurrency } from '@/_utils/format-currency'
import { formatVariation } from '@/_utils/date-range'
import type { KpiMetrics } from '@/_data-access/dashboard/types'

interface KpiCardClickableProps {
  title: string
  value: string
  icon: LucideIcon
  variation?: { value: string; isPositive: boolean }
  iconClassName?: string
  iconBgClassName?: string
  onClick: () => void
}

function KpiCardClickable({
  title,
  value,
  icon: Icon,
  variation,
  iconClassName,
  iconBgClassName,
  onClick,
}: KpiCardClickableProps) {
  return (
    <button
      type="button"
      className="h-full w-full text-left"
      onClick={onClick}
    >
      <Card className="flex h-full w-full flex-col cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-md">
        <CardContent className="flex flex-1 flex-col justify-center p-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-8 items-center justify-center rounded-lg',
                iconBgClassName ?? 'bg-muted',
              )}
            >
              <Icon className={cn('size-4', iconClassName ?? 'text-muted-foreground')} />
            </div>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {variation && (
              <span
                className={cn(
                  'mb-0.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
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
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

interface OverviewKpiGridProps {
  kpi: KpiMetrics
  onDrillKpi: (kpiId: string) => void
}

export function OverviewKpiGrid({ kpi, onDrillKpi }: OverviewKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCardClickable
        title="Novos Leads"
        value={String(kpi.newLeadsCount)}
        icon={Users}
        variation={formatVariation(kpi.newLeadsCount, kpi.prevNewLeadsCount)}
        iconClassName="text-sky-500"
        iconBgClassName="bg-sky-500/10"
        onClick={() => onDrillKpi('kpi-deals')}
      />
      <KpiCardClickable
        title="Receita do Período"
        value={formatCurrency(kpi.wonDealsValue)}
        icon={TrendingUp}
        variation={formatVariation(kpi.wonDealsValue, kpi.prevWonDealsValue)}
        iconClassName="text-primary"
        iconBgClassName="bg-primary/10"
        onClick={() => onDrillKpi('kpi-revenue')}
      />
      <KpiCardClickable
        title="Ticket Médio"
        value={formatCurrency(kpi.avgTicket)}
        icon={Target}
        variation={formatVariation(kpi.avgTicket, kpi.prevAvgTicket)}
        iconClassName="text-amber-500"
        iconBgClassName="bg-amber-500/10"
        onClick={() => onDrillKpi('kpi-ticket')}
      />
      <KpiCardClickable
        title="Valor do Pipeline"
        value={formatCurrency(kpi.totalPipelineValue)}
        icon={DollarSign}
        variation={formatVariation(kpi.totalPipelineValue, kpi.prevPipelineValue)}
        iconClassName="text-emerald-500"
        iconBgClassName="bg-emerald-500/10"
        onClick={() => onDrillKpi('kpi-pipeline')}
      />
    </div>
  )
}
