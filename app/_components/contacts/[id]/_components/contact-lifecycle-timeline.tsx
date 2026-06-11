import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, Clock, User, Zap } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import { CUSTOMER_STATUS_CONFIG } from '@/_lib/lifecycle/customer-status-config'
import type { LifecycleHistoryItemDto } from '@/_data-access/lifecycle/types'

interface ContactLifecycleTimelineProps {
  items: LifecycleHistoryItemDto[]
}

export function ContactLifecycleTimeline({
  items,
}: ContactLifecycleTimelineProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Histórico do Ciclo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem histórico registrado.
          </p>
        ) : (
          <ol className="relative space-y-0 border-l border-border-strong">
            {items.map((item) => {
              const isStatusEntry = item.toStatus !== null

              const toConfig =
                isStatusEntry && item.toStatus
                  ? CUSTOMER_STATUS_CONFIG[item.toStatus]
                  : LIFECYCLE_STAGE_CONFIG[item.toStage]

              const fromConfig = isStatusEntry
                ? item.fromStatus
                  ? CUSTOMER_STATUS_CONFIG[item.fromStatus]
                  : null
                : item.fromStage
                  ? LIFECYCLE_STAGE_CONFIG[item.fromStage]
                  : null

              const showArrow = fromConfig !== null && fromConfig !== toConfig

              return (
                <li key={item.id} className="pb-5 pl-5 last:pb-0">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-border bg-background ring-2 ring-background" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {fromConfig && showArrow && (
                      <>
                        <Badge
                          variant="outline"
                          className={`h-5 px-1.5 text-xs ${fromConfig.badgeClassName}`}
                        >
                          {fromConfig.label}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                      </>
                    )}
                    <Badge
                      variant="outline"
                      className={`h-5 px-1.5 text-xs font-semibold ${toConfig.badgeClassName}`}
                    >
                      {toConfig.label}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Zap className="h-3 w-3 shrink-0" />
                      {item.causeLabel}
                    </span>
                    {item.changedByName && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        {item.changedByName}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      {formatDistanceToNow(item.createdAt, {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
