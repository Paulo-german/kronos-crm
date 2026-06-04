'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { formatCurrency } from '@/_utils/format-currency'
import type { RevenueByProductPoint } from '@/_data-access/reports/products/get-revenue-by-product'

interface RevenueByProductCardProps {
  data: RevenueByProductPoint[]
}

const PRODUCT_COLORS = [
  'hsl(var(--primary))',
  'hsl(217 91% 60%)',
  'hsl(25 95% 53%)',
  'hsl(142 71% 45%)',
  'hsl(271 81% 56%)',
  'hsl(0 72% 51%)',
]

export function RevenueByProductCard({ data }: RevenueByProductCardProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Receita por produto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">Nenhum dado disponível para o período.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((point) => {
    const row: Record<string, string | number> = { month: point.month }
    for (const product of point.products) {
      row[product.productName] = product.revenue
    }
    return row
  })

  const productNames = [
    ...new Set(
      data.flatMap((point) => point.products.map((product) => product.productName)),
    ),
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Receita por produto</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCurrency(value)}
              width={80}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {productNames.map((productName, index) => (
              <Bar
                key={productName}
                dataKey={productName}
                stackId="product"
                fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]}
                radius={index === productNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
