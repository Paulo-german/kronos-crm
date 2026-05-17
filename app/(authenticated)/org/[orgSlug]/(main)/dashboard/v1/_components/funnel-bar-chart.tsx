'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts'
import type { FunnelStage } from '@/_data-access/dashboard'
import { formatCurrency } from '@/_utils/format-currency'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/_components/ui/chart'

const BAR_COLORS = ['hsl(var(--primary))', 'hsl(var(--primary) / 0.8)']

interface FunnelBarChartProps {
  data: FunnelStage[]
}

export function FunnelBarChart({ data }: FunnelBarChartProps) {
  const hasMonetaryValues = data.some((stage) => stage.value > 0)
  const dataKey = hasMonetaryValues ? 'value' : 'count'

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      [dataKey]: {
        label: hasMonetaryValues ? 'Valor' : 'Deals',
        color: BAR_COLORS[0],
      },
    }
    return config
  }, [dataKey, hasMonetaryValues])

  if (data.length === 0 || data.every((stage) => stage.count === 0)) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
        Nenhum deal no pipeline
      </div>
    )
  }

  const chartData = data.map((stage, index) => ({
    ...stage,
    fill: BAR_COLORS[index % 2],
  }))

  return (
    <ChartContainer
      config={chartConfig}
      className="!aspect-auto h-[300px] w-full"
    >
      <BarChart
        data={chartData}
        layout="vertical"
        accessibilityLayer
        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
      >
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          allowDecimals={!hasMonetaryValues}
          tickFormatter={
            hasMonetaryValues
              ? (tick: number) => {
                  if (tick >= 1_000_000) return `R$ ${(tick / 1_000_000).toFixed(1)}M`
                  if (tick >= 1_000) {
                    const k = tick / 1_000
                    return `R$ ${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`
                  }
                  return `R$ ${tick}`
                }
              : undefined
          }
        />
        <YAxis
          dataKey="stageName"
          type="category"
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(_value, _name, item) => {
                const stage = item.payload as FunnelStage
                return (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {stage.stageName}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {hasMonetaryValues
                        ? `${formatCurrency(stage.value)} \u00b7 ${stage.count} deals`
                        : `${stage.count} deals`}
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} maxBarSize={32}>
          {chartData.map((entry) => (
            <Cell key={entry.stageId} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
