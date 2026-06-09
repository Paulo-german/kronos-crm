import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import type { LifecycleMovementItemDto } from '@/_data-access/dashboard-v2/get-recent-lifecycle-movement'
import { ArrowRightIcon } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'

interface RecentMovementTimelineItemProps {
  item: LifecycleMovementItemDto
  orgSlug: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function RecentMovementTimelineItem({
  item,
  orgSlug,
}: RecentMovementTimelineItemProps) {
  const toConfig = LIFECYCLE_STAGE_CONFIG[item.toStage]
  const fromConfig = item.fromStage
    ? LIFECYCLE_STAGE_CONFIG[item.fromStage]
    : null

  const relativeTime = formatDistanceToNow(item.createdAt, {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <Link
      href={`/org/${orgSlug}/contacts/${item.contactId}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
    >
      <Avatar className="size-8 shrink-0">
        {item.contactAvatarUrl && (
          <AvatarImage src={item.contactAvatarUrl} alt={item.contactName} />
        )}
        <AvatarFallback className="text-xs">
          {getInitials(item.contactName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Linha 1: nome + transição de estágio */}
        <div className="flex gap-1 truncate text-sm">
          <span className="font-medium">{item.contactName}</span>

          {fromConfig ? (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className={fromConfig.badgeClassName}>
                {fromConfig.label}
              </Badge>
              <ArrowRightIcon className="h-3 w-3 text-primary" />
              <Badge className={toConfig.badgeClassName}>
                {toConfig.label}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <ArrowRightIcon className="h-3 w-3 text-primary" />
              <Badge className={toConfig.badgeClassName}>
                {toConfig.label}
              </Badge>
            </div>
          )}
        </div>

        {/* Linha 2: causa + tempo relativo */}
        <span className="truncate text-xs text-muted-foreground">
          {item.causeLabel} · {relativeTime}
        </span>
      </div>
    </Link>
  )
}
