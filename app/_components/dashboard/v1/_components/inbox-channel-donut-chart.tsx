'use client'

import { PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Label } from 'recharts'
import type { ChannelDistribution } from '@/_data-access/dashboard'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/_components/ui/chart'

// Cores por canal
const CHANNEL_COLORS: Record<string, string> = {
  WHATSAPP: '#25D366',
  WEB_CHAT: 'hsl(var(--primary))',
}

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WEB_CHAT: 'Web Chat',
}

const chartConfig = {
  count: { label: 'Conversas' },
  WHATSAPP: { label: 'WhatsApp', color: '#25D366' },
  WEB_CHAT: { label: 'Web Chat', color: 'hsl(var(--primary))' },
} satisfies ChartConfig

interface InboxChannelDonutChartProps {
  data: ChannelDistribution[]
}

export function InboxChannelDonutChart({ data }: InboxChannelDonutChartProps) {
  const total = data.reduce((sum, entry) => sum + entry.count, 0)

  if (total === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <PieChartIcon className="size-7 text-white" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Nenhum dado de canal</p>
      </div>
    )
  }

  const chartData = data.map((entry) => ({
    ...entry,
    label: CHANNEL_LABELS[entry.channel] ?? entry.channel,
    fill: CHANNEL_COLORS[entry.channel] ?? 'hsl(var(--muted-foreground))',
  }))

  return (
    <div className="flex flex-col items-center gap-4">
      <ChartContainer
        config={chartConfig}
        className="!aspect-square h-[180px] w-[180px]"
      >
        <PieChart accessibilityLayer>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="channel"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={78}
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
                        conversas
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </Pie>
          <ChartTooltip
            content={<ChartTooltipContent nameKey="channel" hideLabel />}
          />
        </PieChart>
      </ChartContainer>

      {/* Legenda */}
      <div className="flex flex-col gap-1.5 text-sm">
        {chartData.map((entry) => (
          <div key={entry.channel} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-muted-foreground">{entry.label}</span>
            <span className="ml-auto font-medium tabular-nums">
              {entry.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
