'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { LIFECYCLE_STAGE_CONFIG, LIFECYCLE_STAGE_ORDER } from '@/_lib/lifecycle/lifecycle-stage-config'
import type { LifecycleEvolutionPoint } from '@/_data-access/dashboard-v2/get-lifecycle-funnel-metrics'

interface LifecycleEvolutionChartProps {
  data: LifecycleEvolutionPoint[]
}

export function LifecycleEvolutionChart({ data }: LifecycleEvolutionChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Evolução mensal por estágio
        </CardTitle>
      </CardHeader>
      <CardContent className="pr-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const stage = LIFECYCLE_STAGE_ORDER.find((s) => s === name)
                const label = stage ? LIFECYCLE_STAGE_CONFIG[stage].label : name
                return [value.toLocaleString('pt-BR'), label]
              }}
              labelFormatter={(label: string) => `Mês: ${label}`}
              contentStyle={{
                borderRadius: '8px',
                fontSize: '13px',
              }}
            />
            <Legend
              formatter={(value: string) => {
                const stage = LIFECYCLE_STAGE_ORDER.find((s) => s === value)
                return stage ? LIFECYCLE_STAGE_CONFIG[stage].label : value
              }}
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
            {LIFECYCLE_STAGE_ORDER.map((stage) => (
              <Area
                key={stage}
                type="monotone"
                dataKey={stage}
                stackId="lifecycle"
                stroke={LIFECYCLE_STAGE_CONFIG[stage].chartColor}
                fill={LIFECYCLE_STAGE_CONFIG[stage].chartColor}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
