'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Trash2, CheckCheck } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Card, CardContent } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { NotificationVariantIcon } from '@/_components/layout/notification-variant-icon'
import { markNotificationAsRead } from '@/_actions/notification/mark-as-read'
import { deleteNotification } from '@/_actions/notification/delete-notification'
import {
  getNotificationConfig,
  resolveNotificationVariant,
} from '@/_lib/notifications/notification-variant'
import type { NotificationDto } from '@/_data-access/notification/types'
import { ActionableActions } from './actionable-actions'
import { AssignmentActions } from './assignment-actions'
import { AlertActions } from './alert-actions'

interface NotificationCardProps {
  notification: NotificationDto
  onDeleted: (id: string) => void
  onMarkedAsRead: (id: string) => void
}

export const NotificationCard = ({
  notification,
  onDeleted,
  onMarkedAsRead,
}: NotificationCardProps) => {
  const router = useRouter()
  const isUnread = !notification.readAt

  // Computar variante inline no render — sem useEffect
  const config = getNotificationConfig(notification)
  const variant = resolveNotificationVariant(notification)

  const { execute: executeMarkAsRead, isPending: isPendingRead } = useAction(
    markNotificationAsRead,
    {
      onSuccess: () => {
        onMarkedAsRead(notification.id)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao marcar como lida.')
      },
    },
  )

  const { execute: executeDelete, isPending: isPendingDelete } = useAction(deleteNotification, {
    onSuccess: () => {
      onDeleted(notification.id)
      toast.success('Notificação removida.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao remover notificação.')
    },
  })

  const handleCardClick = () => {
    if (variant === 'actionable') return

    if (isUnread) {
      executeMarkAsRead({ notificationId: notification.id })
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const handleMarkAsRead = (event: React.MouseEvent) => {
    event.stopPropagation()
    executeMarkAsRead({ notificationId: notification.id })
  }

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation()
    executeDelete({ notificationId: notification.id })
  }

  // Extrai o token do actionUrl para notificacoes do tipo actionable
  const inviteToken =
    variant === 'actionable' && notification.actionUrl
      ? notification.actionUrl.split('/invite/')[1] ?? null
      : null

  const isClickable =
    variant !== 'actionable' && (!!notification.actionUrl || isUnread)

  return (
    <Card
      className={[
        'transition-colors',
        isUnread ? `border-l-2 ${config.borderColor}` : '',
        isClickable ? 'cursor-pointer hover:bg-muted/50' : '',
        variant === 'alert' && isUnread ? 'bg-amber-50/30 dark:bg-amber-950/10' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={isClickable ? handleCardClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <NotificationVariantIcon notification={notification} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{notification.title}</p>
                  {isUnread && (
                    <Badge
                      variant={config.badgeVariant}
                      className="shrink-0 text-[10px]"
                    >
                      {config.badgeLabel}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>

                {/* Area de acao por variante */}
                {variant === 'actionable' && inviteToken && (
                  <ActionableActions
                    token={inviteToken}
                    onAccepted={() => onDeleted(notification.id)}
                    onDeclined={() => onDeleted(notification.id)}
                  />
                )}

                {variant === 'assignment' && (
                  <AssignmentActions
                    actionUrl={notification.actionUrl}
                    resourceType={notification.resourceType}
                  />
                )}

                {variant === 'alert' && (
                  <AlertActions actionUrl={notification.actionUrl} />
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {isUnread && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={handleMarkAsRead}
                    disabled={isPendingRead}
                    title="Marcar como lida"
                  >
                    <CheckCheck className="size-3.5" />
                    <span className="sr-only">Marcar como lida</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                  disabled={isPendingDelete}
                  title="Remover notificação"
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Remover notificação</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
