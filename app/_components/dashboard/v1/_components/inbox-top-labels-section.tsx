import { Tag } from 'lucide-react'
import type { MemberRole } from '@prisma/client'
import { getTopLabels } from '@/_data-access/dashboard'
import type { DateRange, InboxDashboardFilters } from '@/_data-access/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'

interface InboxTopLabelsSectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
  dateRange: DateRange
  filters: InboxDashboardFilters
}

export async function InboxTopLabelsSection({
  ctx,
  dateRange,
  filters,
}: InboxTopLabelsSectionProps) {
  const labels = await getTopLabels(ctx, dateRange, filters)

  const maxCount = labels.length > 0 ? labels[0].count : 0

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Top Etiquetas
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {labels.length === 0 ? (
          <EmptyLabelsState />
        ) : (
          <ul className="space-y-3">
            {labels.map((label) => {
              const percentage =
                maxCount > 0 ? (label.count / maxCount) * 100 : 0

              return (
                <li key={label.labelId}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: label.labelColor }}
                      />
                      <span className="text-sm font-medium">
                        {label.labelName}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-xs tabular-nums"
                    >
                      {label.count}
                    </Badge>
                  </div>
                  {/* Barra de progresso relativa ao maior count */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: label.labelColor,
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyLabelsState() {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <Tag className="size-7 text-white" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Nenhuma etiqueta no período
      </p>
    </div>
  )
}
