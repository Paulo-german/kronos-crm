import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, History } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import type { LifecycleHistoryItemDto } from '@/_data-access/lifecycle/types'

interface ContactLifecycleTimelineProps {
  items: LifecycleHistoryItemDto[]
}

export function ContactLifecycleTimeline({ items }: ContactLifecycleTimelineProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <History className="h-4 w-4" />
          Histórico de Lifecycle
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem histórico registrado.</p>
        ) : (
          <ol className="relative space-y-0 border-l border-border/50">
            {items.map((item) => {
              const toConfig = LIFECYCLE_STAGE_CONFIG[item.toStage]
              const fromConfig = item.fromStage ? LIFECYCLE_STAGE_CONFIG[item.fromStage] : null

              return (
                <li key={item.id} className="pb-5 pl-5 last:pb-0">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-border bg-background ring-2 ring-background" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {fromConfig && (
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.causeLabel}
                    {item.changedByName && ` · ${item.changedByName}`}
                    <span className="ml-1.5">
                      ·{' '}
                      {formatDistanceToNow(item.createdAt, {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
