'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Label } from 'recharts'
import { Bot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/_components/ui/chart'
import { Badge } from '@/_components/ui/badge'
import type { AiMetrics } from '@/_data-access/dashboard'
import { formatNumber } from '@/_utils/format-number'

const chartConfig = {
  credits: { label: 'Créditos' },
  used: { label: 'Usado', color: 'var(--kronos-purple)' },
  available: { label: 'Disponível', color: 'hsl(var(--muted))' },
} satisfies ChartConfig

interface AiPlanUsageCardProps {
  metrics: AiMetrics
}

export function AiPlanUsageCard({ metrics }: AiPlanUsageCardProps) {
  const usagePercent = metrics.monthlyLimit > 0
    ? Math.round((metrics.creditsUsed / metrics.monthlyLimit) * 100)
    : 0

  const chartData = useMemo(
    () => [
      {
        name: 'used',
        value: metrics.creditsUsed,
        fill: 'var(--color-used)',
      },
      {
        name: 'available',
        value: Math.max(0, metrics.monthlyLimit - metrics.creditsUsed),
        fill: 'var(--color-available)',
      },
    ],
    [metrics.creditsUsed, metrics.monthlyLimit],
  )

  const activeAgents = metrics.agents.filter((agent) => agent.isActive)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Uso do Plano</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <ChartContainer
              config={chartConfig}
              className="!aspect-square h-[160px] w-[160px]"
            >
              <PieChart accessibilityLayer>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
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
                              {usagePercent}%
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) + 18}
                              className="fill-muted-foreground text-xs"
                            >
                              usado
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      hideLabel
                      formatter={(value) => (
                        <span className="font-mono font-medium tabular-nums">
                          {formatNumber(value as number)}
                        </span>
                      )}
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
          </div>

          <div className="flex-1 space-y-2.5">
            {activeAgents.length > 0 ? (
              activeAgents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <Bot className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm text-muted-foreground">
                    {agent.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {agent.modelId.split('/').pop()}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum agente ativo
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
