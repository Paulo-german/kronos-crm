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
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      count: { label: 'Deals', color: BAR_COLORS[0] },
    }
    return config
  }, [])

  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
        Nenhum deal no pipeline
      </div>
    )
  }

  const chartData = data.map((d, i) => ({
    ...d,
    fill: BAR_COLORS[i % 2],
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
        <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} />
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
              formatter={(value, _name, item) => {
                const stage = item.payload as FunnelStage
                return (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {stage.stageName}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {value} deals &middot; {formatCurrency(stage.value)}
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
          {chartData.map((entry) => (
            <Cell key={entry.stageId} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
