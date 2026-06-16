'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { NotificationCategoryBadge } from '../_components/notification-category-badge'
import { useNotification } from './notification-context'

interface NotificationTextProps {
  className?: string
}

/**
 * Bloco textual da notificação: título + chip de categoria + badge de urgência
 * (quando não lida) + body + timestamp relativo. No modo compacto o body fica
 * em uma linha.
 */
export const NotificationText = ({ className }: NotificationTextProps) => {
  const { notification, config, isUnread, compact } = useNotification()

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-2">
        <p className="truncate text-sm font-medium">{notification.title}</p>
        <NotificationCategoryBadge category={notification.category} />
        {isUnread && (
          <Badge variant={config.badgeVariant} className="shrink-0 text-[10px]">
            {config.badgeLabel}
          </Badge>
        )}
      </div>

      <p
        className={cn(
          'mt-1 text-sm text-muted-foreground',
          compact && 'line-clamp-1',
        )}
      >
        {notification.body}
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(notification.createdAt), {
          addSuffix: true,
          locale: ptBR,
        })}
      </p>
    </div>
  )
}
