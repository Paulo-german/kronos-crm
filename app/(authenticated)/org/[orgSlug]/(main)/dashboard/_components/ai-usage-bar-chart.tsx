'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Zap } from 'lucide-react'
import type { AiMonthlyHistory } from '@/_data-access/dashboard'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/_components/ui/chart'
import { formatNumber } from '@/_utils/format-number'

const chartConfig = {
  creditsSpent: {
    label: 'Créditos',
    color: 'var(--kronos-purple)',
  },
  messagesUsed: {
    label: 'Mensagens',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

interface AiUsageBarChartProps {
  data: AiMonthlyHistory[]
}

export function AiUsageBarChart({ data }: AiUsageBarChartProps) {
  const hasData = data.some(
    (entry) => entry.creditsSpent > 0 || entry.messagesUsed > 0,
  )

  if (!hasData) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <Zap className="size-7 text-primary-foreground" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Nenhum consumo no período</p>
      </div>
    )
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="!aspect-auto h-[38vh] w-full"
    >
      <BarChart
        data={data}
        accessibilityLayer
        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) =>
            new Intl.NumberFormat('pt-BR', {
              notation: 'compact',
              compactDisplay: 'short',
            }).format(value)
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name) => (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {name === 'creditsSpent' ? 'Créditos' : 'Mensagens'}
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatNumber(value as number)}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar
          dataKey="creditsSpent"
          fill="var(--color-creditsSpent)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="messagesUsed"
          fill="var(--color-messagesUsed)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
