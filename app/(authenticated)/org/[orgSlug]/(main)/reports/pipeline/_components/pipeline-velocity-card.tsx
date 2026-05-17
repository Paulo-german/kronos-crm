import { TrendingUp, TrendingDown, Gauge, Trophy, Banknote, Timer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'
import { formatVariation } from '@/_utils/date-range'

export interface PipelineVelocityDto {
  numDeals: number
  winRate: number
  avgTicket: number
  avgCycleDays: number
  velocity: number
  prevNumDeals: number
  prevWinRate: number
  prevAvgTicket: number
  prevAvgCycleDays: number
  prevVelocity: number
}

interface PipelineVelocityCardProps {
  data: PipelineVelocityDto
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)

interface MetricMiniCardProps {
  label: string
  value: string
  variation?: { value: string; isPositive: boolean }
  icon: React.ComponentType<{ className?: string }>
  iconClassName?: string
  iconBgClassName?: string
}

function MetricMiniCard({
  label,
  value,
  variation,
  icon: Icon,
  iconClassName,
  iconBgClassName,
}: MetricMiniCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/40 bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <div className={cn('flex size-7 items-center justify-center rounded-md', iconBgClassName ?? 'bg-muted')}>
          <Icon className={cn('size-3.5', iconClassName ?? 'text-muted-foreground')} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-bold tabular-nums">{value}</span>
        {variation && (
          <span
            className={cn(
              'mb-0.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              variation.isPositive
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
            )}
          >
            {variation.isPositive ? (
              <TrendingUp className="size-2.5" />
            ) : (
              <TrendingDown className="size-2.5" />
            )}
            {variation.value}
          </span>
        )}
      </div>
    </div>
  )
}

export function PipelineVelocityCard({ data }: PipelineVelocityCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Velocidade do Pipeline</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Receita gerada por dia de ciclo de vendas
            </p>
          </div>
          {/* Métrica âncora: velocity em destaque */}
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-primary">
              {formatCurrency(data.velocity)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/dia</span>
            </p>
            {(() => {
              const variation = formatVariation(data.velocity, data.prevVelocity)
              return (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    variation.isPositive
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
                  )}
                >
                  {variation.isPositive ? (
                    <TrendingUp className="size-2.5" />
                  ) : (
                    <TrendingDown className="size-2.5" />
                  )}
                  {variation.value} vs período anterior
                </span>
              )
            })()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricMiniCard
          label="Deals no período"
          value={String(data.numDeals)}
          variation={formatVariation(data.numDeals, data.prevNumDeals)}
          icon={Gauge}
          iconClassName="text-sky-500"
          iconBgClassName="bg-sky-500/10"
        />
        <MetricMiniCard
          label="Taxa de conversão"
          value={`${data.winRate.toFixed(1)}%`}
          variation={formatVariation(data.winRate, data.prevWinRate)}
          icon={Trophy}
          iconClassName="text-amber-500"
          iconBgClassName="bg-amber-500/10"
        />
        <MetricMiniCard
          label="Ticket médio"
          value={formatCurrency(data.avgTicket)}
          variation={formatVariation(data.avgTicket, data.prevAvgTicket)}
          icon={Banknote}
          iconClassName="text-emerald-500"
          iconBgClassName="bg-emerald-500/10"
        />
        <MetricMiniCard
          label="Ciclo médio"
          value={`${data.avgCycleDays.toFixed(0)} dias`}
          // Para ciclo: menor é melhor → invertemos a lógica de isPositive
          variation={(() => {
            const v = formatVariation(data.prevAvgCycleDays, data.avgCycleDays)
            return v
          })()}
          icon={Timer}
          iconClassName="text-violet-500"
          iconBgClassName="bg-violet-500/10"
        />
      </CardContent>

      <div className="border-t border-border/40 px-6 py-2">
        <p className="text-[10px] text-muted-foreground">
          * Ciclo calculado com base na última atualização do deal
        </p>
      </div>
    </Card>
  )
}
