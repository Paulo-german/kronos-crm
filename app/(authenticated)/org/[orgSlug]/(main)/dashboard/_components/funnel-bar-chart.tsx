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

const DEFAULT_COLORS = [
  'var(--kronos-purple)',
  'var(--kronos-purple-light)',
  'hsl(var(--kronos-blue))',
  'var(--kronos-green)',
  'var(--kronos-green-light)',
]

function sanitizeKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase()
}

interface FunnelBarChartProps {
  data: FunnelStage[]
}

export function FunnelBarChart({ data }: FunnelBarChartProps) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = { count: { label: 'Deals' } }
    for (const [i, stage] of data.entries()) {
      config[sanitizeKey(stage.stageName)] = {
        label: stage.stageName,
        color: stage.stageColor ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      }
    }
    return config
  }, [data])

  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Nenhum deal no pipeline
      </div>
    )
  }

  const chartData = data.map((d, i) => ({
    ...d,
    key: sanitizeKey(d.stageName),
    fill: d.stageColor ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }))

  return (
    <ChartContainer config={chartConfig} className="!aspect-auto h-[300px] w-full">
      <BarChart
        data={chartData}
        layout="vertical"
        accessibilityLayer
        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
      >
        <XAxis type="number" axisLine={false} tickLine={false} />
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
