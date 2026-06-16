'use client'

import { Slot } from '@radix-ui/react-slot'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { cn } from '@/_lib/utils'
import { markNotificationAsRead } from '@/_actions/notification/mark-as-read'
import { deleteNotification } from '@/_actions/notification/delete-notification'
import {
  getNotificationConfig,
  resolveNotificationVariant,
} from '@/_lib/notifications/notification-variant'
import type { NotificationDto } from '@/_data-access/notification/types'
import { NotificationProvider } from './notification-context'

interface NotificationRootProps {
  notification: NotificationDto
  /** Densidade compacta — usado no popover do sino. */
  compact?: boolean
  /** Renderiza o wrapper no elemento filho (ex.: <button>, <Link>). */
  asChild?: boolean
  className?: string
  /** Callback após marcar como lida (otimismo a cargo da superfície). */
  onMarkedAsRead?: (id: string) => void
  /** Callback após remover/dispensar (otimismo a cargo da superfície). */
  onDeleted?: (id: string) => void
  /** Disparado ao selecionar o card (ex.: sino fecha o popover). */
  onSelect?: () => void
  children: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

/**
 * Raiz do compound de notificação. Deriva variant/config/isUnread uma vez,
 * concentra os hooks de ação (marcar lida / excluir) e provê tudo via context.
 * O wrapper é polimórfico (asChild) para cada superfície escolher o elemento.
 */
export const NotificationRoot = ({
  notification,
  compact = false,
  asChild = false,
  className,
  onMarkedAsRead,
  onDeleted,
  onSelect,
  children,
  onClick,
}: NotificationRootProps) => {
  const variant = resolveNotificationVariant(notification)
  const config = getNotificationConfig(notification)
  const isUnread = !notification.readAt

  const { execute: executeMarkAsRead, isPending: isPendingRead } = useAction(
    markNotificationAsRead,
    {
      onSuccess: () => onMarkedAsRead?.(notification.id),
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao marcar como lida.')
      },
    },
  )

  const { execute: executeDelete, isPending: isPendingDelete } = useAction(
    deleteNotification,
    {
      onSuccess: () => {
        onDeleted?.(notification.id)
        toast.success('Notificação removida.')
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover notificação.')
      },
    },
  )

  const Wrapper = asChild ? Slot : 'div'

  return (
    <NotificationProvider
      value={{
        notification,
        variant,
        config,
        isUnread,
        compact,
        markAsRead: () =>
          executeMarkAsRead({ notificationId: notification.id }),
        remove: () => executeDelete({ notificationId: notification.id }),
        isPendingRead,
        isPendingDelete,
        onDismiss: () => onDeleted?.(notification.id),
        onSelect: () => onSelect?.(),
      }}
    >
      <Wrapper className={cn(className)} onClick={onClick}>
        {children}
      </Wrapper>
    </NotificationProvider>
  )
}
