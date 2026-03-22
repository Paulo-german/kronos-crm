'use client'

import { TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { RevenueByMonth } from '@/_data-access/dashboard'
import { formatCurrency } from '@/_utils/format-currency'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/_components/ui/chart'

const chartConfig = {
  revenue: {
    label: 'Receita',
    color: 'var(--kronos-purple)',
  },
} satisfies ChartConfig

interface RevenueAreaChartProps {
  data: RevenueByMonth[]
}

export function RevenueAreaChart({ data }: RevenueAreaChartProps) {
  const hasData = data.some((d) => d.revenue > 0)

  if (!hasData) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <TrendingUp className="size-7 text-white" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Nenhuma receita no período</p>
      </div>
    )
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="!aspect-auto h-[38vh] w-full"
    >
      <AreaChart
        data={data}
        accessibilityLayer
        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-revenue)"
              stopOpacity={0.4}
            />
            <stop
              offset="100%"
              stopColor="var(--color-revenue)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            new Intl.NumberFormat('pt-BR', {
              notation: 'compact',
              compactDisplay: 'short',
              style: 'currency',
              currency: 'BRL',
            }).format(v)
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Receita</span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatCurrency(value as number)}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-revenue)"
          strokeWidth={2.5}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ChartContainer>
  )
}
