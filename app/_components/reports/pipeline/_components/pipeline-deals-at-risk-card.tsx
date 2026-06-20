import Link from 'next/link'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { cn } from '@/_lib/utils'
import { formatCompactCurrency } from '@/_utils/format-currency'
import type { DealAtRisk } from '@/_data-access/reports/pipeline/get-deals-at-risk'

interface PipelineDealsAtRiskCardProps {
  deals: DealAtRisk[]
  total: number
  orgSlug: string
}

function DaysIdleBadge({ days }: { days: number }) {
  const isUrgent = days > 30
  const isWarning = days > 14

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        isUrgent
          ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
          : isWarning
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
            : 'bg-muted text-muted-foreground',
      )}
    >
      {isUrgent || isWarning ? <AlertTriangle className="size-2.5" /> : null}
      {days}d parado
    </span>
  )
}

const VISIBLE_LIMIT = 5

export function PipelineDealsAtRiskCard({
  deals,
  total,
  orgSlug,
}: PipelineDealsAtRiskCardProps) {
  const visibleDeals = deals.slice(0, VISIBLE_LIMIT)
  const hasMore = total > VISIBLE_LIMIT

  if (deals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Deals em Risco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10">
              <AlertTriangle className="size-5 text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhum deal em risco no momento
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Deals em Risco</CardTitle>
          <Badge variant="secondary" className="tabular-nums">
            {total} {total === 1 ? 'deal' : 'deals'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/40">
          {visibleDeals.map((deal) => (
            <li
              key={deal.id}
              className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/30"
            >
              {/* Conteúdo principal */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {deal.title}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{deal.assigneeName}</span>
                  <span>·</span>
                  <span className="truncate">{deal.stageName}</span>
                  <span>·</span>
                  <span className="font-medium text-foreground/70">
                    {formatCompactCurrency(deal.value)}
                  </span>
                </div>
              </div>

              {/* Badge de dias parado — único indicador de urgência (mede risco real) */}
              <DaysIdleBadge days={deal.daysSinceUpdate} />
            </li>
          ))}
        </ul>

        {hasMore && (
          <div className="border-t border-border/40 px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full gap-1 text-xs text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href={`/org/${orgSlug}/crm/deals/pipeline`}>
                Ver todos ({total})
                <ChevronRight className="size-3" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
