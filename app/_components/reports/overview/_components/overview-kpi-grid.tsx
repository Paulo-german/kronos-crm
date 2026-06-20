'use client'

import { DollarSign, TrendingUp, Target, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'
import { formatCurrency } from '@/_utils/format-currency'
import { formatVariation } from '@/_utils/date-range'
import { VariationBadge } from '@/_components/reports/_components/variation-badge'
import type { KpiMetrics } from '@/_data-access/dashboard/types'

interface KpiCardClickableProps {
  title: string
  value: string
  icon: LucideIcon
  variation?: ReturnType<typeof formatVariation>
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
    <button type="button" className="h-full w-full text-left" onClick={onClick}>
      <Card className="flex h-full w-full cursor-pointer flex-col transition-all duration-200 hover:border-primary/50 hover:shadow-md">
        <CardContent className="flex flex-1 flex-col justify-center p-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex size-8 items-center justify-center rounded-lg',
                iconBgClassName ?? 'bg-muted',
              )}
            >
              <Icon
                className={cn(
                  'size-4',
                  iconClassName ?? 'text-muted-foreground',
                )}
              />
            </div>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {variation && (
              <VariationBadge variation={variation} className="mb-0.5 ml-0" />
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
      {/* Pipeline é um snapshot all-time (não recortado pelo período), então
          não há base de comparação temporal — omitimos a variação para não
          exibir um delta perpetuamente neutro/enganoso. */}
      <KpiCardClickable
        title="Valor do Pipeline"
        value={formatCurrency(kpi.totalPipelineValue)}
        icon={DollarSign}
        iconClassName="text-emerald-500"
        iconBgClassName="bg-emerald-500/10"
        onClick={() => onDrillKpi('kpi-pipeline')}
      />
    </div>
  )
}
