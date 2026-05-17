'use client'

import { PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Label } from 'recharts'
import type { DealsByStatus } from '@/_data-access/dashboard'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/_components/ui/chart'
import { DEAL_STATUS_CONFIG } from './deal-status-config'

const chartConfig = {
  count: { label: 'Deals' },
  ...DEAL_STATUS_CONFIG,
} satisfies ChartConfig

interface PipelineDonutChartProps {
  data: DealsByStatus[]
}

export function PipelineDonutChart({ data }: PipelineDonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (total === 0) {
    return (
      <div className="flex h-[160px] flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <PieChartIcon className="size-7 text-white" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Nenhum deal encontrado</p>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    fill: `var(--color-${d.status})`,
  }))

  return (
    <ChartContainer
      config={chartConfig}
      className="!aspect-square h-[160px] w-[160px]"
    >
      <PieChart accessibilityLayer>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={70}
          paddingAngle={2}
          strokeWidth={0}
          cornerRadius={20}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-2xl font-bold"
                    >
                      {total}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 18}
                      className="fill-muted-foreground text-xs"
                    >
                      deals
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </Pie>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="status" hideLabel />}
        />
      </PieChart>
    </ChartContainer>
  )
}
