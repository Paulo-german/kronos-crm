'use client'

import type { ComponentType } from 'react'
import { Bot, ArrowRightLeft, CheckCircle2, PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Label } from 'recharts'
import type { AiHumanBreakdown } from '@/_data-access/dashboard'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/_components/ui/chart'

const aiHumanChartConfig = {
  count: { label: 'Conversas' },
  ai: { label: 'IA', color: 'hsl(var(--primary))' },
  human: { label: 'Humano', color: 'hsl(var(--muted-foreground))' },
} satisfies ChartConfig

interface InboxAiHumanChartProps {
  breakdown: AiHumanBreakdown
}

export function InboxAiHumanChart({ breakdown }: InboxAiHumanChartProps) {
  const total = breakdown.aiConversations + breakdown.humanOnlyConversations

  if (total === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
            <PieChartIcon className="size-7 text-white" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhum dado de atendimento no período
        </p>
      </div>
    )
  }

  const chartData = [
    {
      segment: 'ai',
      count: breakdown.aiConversations,
      fill: 'var(--color-ai)',
    },
    {
      segment: 'human',
      count: breakdown.humanOnlyConversations,
      fill: 'var(--color-human)',
    },
  ]

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      {/* Mini donut */}
      <div className="flex shrink-0 justify-center">
        <ChartContainer
          config={aiHumanChartConfig}
          className="!aspect-square h-[160px] w-[160px]"
        >
          <PieChart accessibilityLayer>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="segment"
              cx="50%"
              cy="50%"
              innerRadius={62}
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
                          total
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="segment" hideLabel />}
            />
          </PieChart>
        </ChartContainer>
      </div>

      {/* Stats verticais */}
      <div className="flex flex-1 flex-col gap-3">
        {/* IA */}
        <StatRow
          icon={Bot}
          iconClassName="text-primary"
          iconBgClassName="bg-primary/10"
          label="Atendidas por IA"
          value={String(breakdown.aiConversations)}
          subValue={
            total > 0
              ? `${((breakdown.aiConversations / total) * 100).toFixed(1)}%`
              : '0%'
          }
        />

        {/* Handoffs */}
        <StatRow
          icon={ArrowRightLeft}
          iconClassName="text-amber-500"
          iconBgClassName="bg-amber-500/10"
          label="Handoffs para Humano"
          value={String(breakdown.handoffCount)}
        />

        {/* Taxa de sucesso IA */}
        <StatRow
          icon={CheckCircle2}
          iconClassName="text-emerald-500"
          iconBgClassName="bg-emerald-500/10"
          label="Taxa de Sucesso IA"
          value={`${breakdown.aiSuccessRate.toFixed(1)}%`}
        />
      </div>
    </div>
  )
}

interface StatRowProps {
  icon: ComponentType<{ className?: string }>
  iconClassName: string
  iconBgClassName: string
  label: string
  value: string
  subValue?: string
}

function StatRow({
  icon: Icon,
  iconClassName,
  iconBgClassName,
  label,
  value,
  subValue,
}: StatRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconBgClassName}`}
      >
        <Icon className={`size-4 ${iconClassName}`} />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-1">
          <p className="text-lg font-bold">{value}</p>
          {subValue && (
            <span className="text-xs text-muted-foreground">{subValue}</span>
          )}
        </div>
      </div>
    </div>
  )
}
