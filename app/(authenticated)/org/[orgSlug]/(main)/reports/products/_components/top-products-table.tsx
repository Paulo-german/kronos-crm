import { TrendingUp, TrendingDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { cn } from '@/_lib/utils'
import { formatCurrency } from '@/_utils/format-currency'
import { formatVariation } from '@/_utils/date-range'
import type { ProductMixRow } from '@/_data-access/reports/products/get-product-mix'

interface TopProductsTableProps {
  data: ProductMixRow[]
  title?: string
}

interface VariationBadgeProps {
  current: number
  previous: number
}

function VariationBadge({ current, previous }: VariationBadgeProps) {
  const variation = formatVariation(current, previous)
  if (!variation) return null

  return (
    <span
      className={cn(
        'ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
        variation.isPositive
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
      )}
    >
      {variation.isPositive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {variation.value}
    </span>
  )
}

export function TopProductsTable({ data }: TopProductsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead className="text-right">Unidades vendidas</TableHead>
          <TableHead className="text-right">Receita</TableHead>
          <TableHead className="text-right">Share</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
              Nenhum produto vendido no período.
            </TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow key={row.productId}>
              <TableCell className="font-medium">{row.productName}</TableCell>
              <TableCell className="text-right">
                <span>{row.unitsSold}</span>
                <VariationBadge current={row.unitsSold} previous={row.prevUnitsSold} />
              </TableCell>
              <TableCell className="text-right">
                <span>{formatCurrency(row.revenue)}</span>
                <VariationBadge current={row.revenue} previous={row.prevRevenue} />
              </TableCell>
              <TableCell className="text-right">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {row.share.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
