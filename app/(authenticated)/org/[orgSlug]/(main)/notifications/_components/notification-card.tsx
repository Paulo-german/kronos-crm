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
import { NotificationTypeIcon } from '@/_components/layout/notification-type-icon'
import { markNotificationAsRead } from '@/_actions/notification/mark-as-read'
import { deleteNotification } from '@/_actions/notification/delete-notification'
import type { NotificationDto } from '@/_data-access/notification/types'

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

  return (
    <Card
      className={`transition-colors ${isUnread ? 'border-l-2 border-l-blue-500' : ''} ${notification.actionUrl ? 'cursor-pointer hover:bg-muted/50' : ''}`}
      onClick={notification.actionUrl || isUnread ? handleCardClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <NotificationTypeIcon type={notification.type} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{notification.title}</p>
                  {isUnread && (
                    <Badge variant="default" className="shrink-0 text-[10px]">
                      Nova
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
