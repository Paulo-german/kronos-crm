import { Card, CardHeader, CardTitle, CardContent } from '@/_components/ui/card'
import { formatCurrency } from '@/_utils/format-currency'
import type { ProductMixRow } from '@/_data-access/reports/products/get-product-mix'

interface ProductMixCardProps {
  data: ProductMixRow[]
}

export function ProductMixCard({ data }: ProductMixCardProps) {
  const topFive = data.slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Mix de produtos</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {topFive.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum produto vendido no período.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {topFive.map((row) => (
              <div key={row.productId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {row.productName}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {formatCurrency(row.revenue)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, row.share).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                    {row.share.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {data.length > 5 && (
        <p className="px-4 pb-3 text-xs text-muted-foreground">+{data.length - 5} produtos</p>
      )}
    </Card>
  )
}
