'use client'

import { useRouter } from 'next/navigation'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { cn } from '@/_lib/utils'
import { Notification, useNotification } from '../notification'
import type { NotificationDto } from '@/_data-access/notification/types'

interface NotificationCardProps {
  notification: NotificationDto
  onDeleted: (id: string) => void
  onMarkedAsRead: (id: string) => void
  /** Densidade compacta (sino): paddings menores, body em 1 linha. */
  compact?: boolean
  /** Disparado ao clicar no card (ex.: sino fecha o popover). */
  onSelect?: () => void
}

/**
 * Controles do card (lado direito): marcar como lida.
 * Lê o context — por isso vive dentro de <Notification.Root>.
 */
const CardControls = () => {
  const { isUnread, markAsRead, isPendingRead } = useNotification()

  if (!isUnread) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      onClick={(event) => {
        event.stopPropagation()
        markAsRead()
      }}
      disabled={isPendingRead}
      title="Marcar como lida"
    >
      <CheckCheck className="size-3.5" />
      <span className="sr-only">Marcar como lida</span>
    </Button>
  )
}

/**
 * Casca clicável do card. Lê o context para resolver a navegação e o estilo por
 * variant. Compõe os tijolos do compound (Icon / Content / Text / Actions).
 */
const CardShell = () => {
  const router = useRouter()
  const { notification, variant, isUnread, compact, markAsRead, onSelect } =
    useNotification()

  const isClickable =
    variant !== 'actionable' && (!!notification.actionUrl || isUnread)

  const handleClick = () => {
    if (variant === 'actionable') return
    if (isUnread) markAsRead()
    onSelect()
    if (notification.actionUrl) router.push(notification.actionUrl)
  }

  return (
    <div
      className={cn(
        'rounded-xl transition-colors',
        isClickable && 'cursor-pointer hover:bg-muted/50',
      )}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className={cn('flex items-start gap-3', compact ? 'p-3' : 'p-4')}>
        <Notification.Icon className="mt-0.5" />
        <Notification.Content>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Notification.Text />
              <Notification.Actions />
            </div>
            <CardControls />
          </div>
        </Notification.Content>
      </div>
    </div>
  )
}

/** Superfície de card composta a partir do compound (página e sino). */
export const NotificationCard = ({
  notification,
  onDeleted,
  onMarkedAsRead,
  compact = false,
  onSelect,
}: NotificationCardProps) => {
  return (
    <Notification.Root
      notification={notification}
      onDeleted={onDeleted}
      onMarkedAsRead={onMarkedAsRead}
      onSelect={onSelect}
      compact={compact}
      asChild
    >
      <CardShell />
    </Notification.Root>
  )
}
