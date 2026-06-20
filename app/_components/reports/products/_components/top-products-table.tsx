import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { formatCurrency } from '@/_utils/format-currency'
import { formatVariation } from '@/_utils/date-range'
import type { ProductMixRow } from '@/_data-access/reports/products/get-product-mix'
import { VariationBadge } from '@/_components/reports/_components/variation-badge'

interface TopProductsTableProps {
  data: ProductMixRow[]
}

export function TopProductsTable({ data }: TopProductsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead className="text-right">Unidades vendidas</TableHead>
          <TableHead className="text-right">Receita</TableHead>
          <TableHead className="text-right">Share do total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="py-8 text-center text-sm text-muted-foreground"
            >
              Nenhum produto vendido no período.
            </TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow key={row.productId}>
              <TableCell className="font-medium">{row.productName}</TableCell>
              <TableCell className="text-right">
                <span>{row.unitsSold}</span>
                <VariationBadge
                  variation={formatVariation(row.unitsSold, row.prevUnitsSold)}
                />
              </TableCell>
              <TableCell className="text-right">
                <span>{formatCurrency(row.revenue)}</span>
                <VariationBadge
                  variation={formatVariation(row.revenue, row.prevRevenue)}
                />
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
