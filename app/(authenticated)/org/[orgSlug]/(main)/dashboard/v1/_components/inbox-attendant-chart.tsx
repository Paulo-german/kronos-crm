'use client'

import { Users } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { AttendantPerformance } from '@/_data-access/dashboard'
import { formatDurationMs } from '@/_utils/format-duration-ms'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/_components/ui/chart'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'

const chartConfig = {
  conversationsHandled: {
    label: 'Conversas',
    color: 'var(--kronos-purple)',
  },
} satisfies ChartConfig

interface InboxAttendantChartProps {
  data: AttendantPerformance[]
}

// Tick customizado para o eixo Y com avatar + nome
interface CustomTickProps {
  x: number
  y: number
  payload: { value: string }
}

function CustomYAxisTick(
  props: CustomTickProps,
  attendants: AttendantPerformance[],
) {
  const { x, y, payload } = props
  const attendant = attendants.find(
    (entry) => entry.userName.split(' ')[0] === payload.value,
  )
  if (!attendant) return null

  const initials = attendant.userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-90} y={-12} width={85} height={24}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Avatar style={{ width: '20px', height: '20px' }}>
            <AvatarImage
              src={attendant.userAvatar ?? undefined}
              alt={attendant.userName}
            />
            <AvatarFallback style={{ fontSize: '8px' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            style={{
              fontSize: '11px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '58px',
            }}
          >
            {attendant.userName.split(' ')[0]}
          </span>
        </div>
      </foreignObject>
    </g>
  )
}

export function InboxAttendantChart({ data }: InboxAttendantChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <Users className="size-7 text-white" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhum atendente com conversas no período
        </p>
      </div>
    )
  }

  // Dados com o primeiro nome para o eixo Y
  const chartData = data.map((attendant) => ({
    ...attendant,
    shortName: attendant.userName.split(' ')[0] ?? attendant.userName,
  }))

  // Altura dinâmica baseada no número de atendentes
  const BAR_HEIGHT = 40
  const chartHeight = Math.max(200, data.length * BAR_HEIGHT + 40)

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height: `${chartHeight}px` }}
    >
      <BarChart
        data={chartData}
        layout="vertical"
        accessibilityLayer
        margin={{ top: 5, right: 20, left: 90, bottom: 5 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="shortName"
          axisLine={false}
          tickLine={false}
          width={90}
          tick={(tickProps: unknown) => {
            const typed = tickProps as CustomTickProps
            return CustomYAxisTick(typed, data) ?? <g />
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => {
                const attendant = item.payload as AttendantPerformance
                return (
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Conversas</span>
                      <span className="font-medium tabular-nums">{value}</span>
                    </div>
                    {attendant.avgFirstResponseTimeMs != null && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          TTFR médio
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatDurationMs(attendant.avgFirstResponseTimeMs)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        Taxa resolução
                      </span>
                      <span className="font-medium tabular-nums">
                        {attendant.resolutionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              }}
            />
          }
        />
        <Bar
          dataKey="conversationsHandled"
          fill="var(--color-conversationsHandled)"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ChartContainer>
  )
}
