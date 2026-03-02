'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/_components/ui/chart'
import type { AiMonthlyHistory } from '@/_data-access/dashboard'
import { formatNumber } from '@/_utils/format-number'

const chartConfig = {
  creditsSpent: {
    label: 'Créditos',
    color: 'var(--kronos-purple)',
  },
} satisfies ChartConfig

interface AiCreditsChartProps {
  data: AiMonthlyHistory[]
}

export function AiCreditsChart({ data }: AiCreditsChartProps) {
  const hasData = data.some((entry) => entry.creditsSpent > 0)

  if (!hasData) {
    return (
      <div className="flex h-[160px] items-center justify-center text-sm text-muted-foreground">
        Nenhum consumo no período
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
          <linearGradient
            id="creditsGradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="var(--color-creditsSpent)"
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor="var(--color-creditsSpent)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
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
              formatter={(value) => (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Créditos</span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatNumber(value as number)}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="creditsSpent"
          stroke="var(--color-creditsSpent)"
          strokeWidth={2}
          fill="url(#creditsGradient)"
        />
      </AreaChart>
    </ChartContainer>
  )
}
