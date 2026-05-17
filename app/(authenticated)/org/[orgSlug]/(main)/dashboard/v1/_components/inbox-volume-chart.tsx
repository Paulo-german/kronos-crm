'use client'

import { MessageSquare } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { ConversationVolumeByDay } from '@/_data-access/dashboard'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/_components/ui/chart'

const chartConfig = {
  opened: {
    label: 'Abertas',
    color: 'var(--kronos-purple)',
  },
  resolved: {
    label: 'Resolvidas',
    color: 'var(--color-emerald-500, #10b981)',
  },
} satisfies ChartConfig

interface InboxVolumeChartProps {
  data: ConversationVolumeByDay[]
}

export function InboxVolumeChart({ data }: InboxVolumeChartProps) {
  const hasData = data.some(
    (day) => day.opened > 0 || day.resolved > 0,
  )

  if (!hasData) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <MessageSquare className="size-7 text-white" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhuma conversa no período
        </p>
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
          <linearGradient id="openedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-opened)"
              stopOpacity={0.4}
            />
            <stop
              offset="100%"
              stopColor="var(--color-opened)"
              stopOpacity={0}
            />
          </linearGradient>
          <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-resolved)"
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor="var(--color-resolved)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} />
        <YAxis
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name) => (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {name === 'opened' ? 'Abertas' : 'Resolvidas'}
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {value}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="opened"
          stroke="var(--color-opened)"
          strokeWidth={2.5}
          fill="url(#openedGradient)"
          stackId="a"
        />
        <Area
          type="monotone"
          dataKey="resolved"
          stroke="var(--color-resolved)"
          strokeWidth={2.5}
          fill="url(#resolvedGradient)"
          stackId="b"
        />
      </AreaChart>
    </ChartContainer>
  )
}
