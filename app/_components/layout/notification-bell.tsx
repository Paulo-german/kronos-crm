'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { cn } from '@/_lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Button } from '@/_components/ui/button'
import { ScrollArea } from '@/_components/ui/scroll-area'
import { Separator } from '@/_components/ui/separator'
import { NotificationVariantIcon } from '@/_components/layout/notification-variant-icon'
import { resolveNotificationVariant } from '@/_lib/notifications/notification-variant'
import { markNotificationAsRead } from '@/_actions/notification/mark-as-read'
import { markAllNotificationsAsRead } from '@/_actions/notification/mark-all-as-read'
import type { NotificationDto } from '@/_data-access/notification/types'

const POLLING_INTERVAL_MS = 120_000

interface NotificationBellProps {
  orgSlug: string
  initialUnreadCount: number
  initialNotifications: NotificationDto[]
  notificationsHref?: string
}

export const NotificationBell = ({
  orgSlug,
  initialUnreadCount,
  initialNotifications,
  notificationsHref,
}: NotificationBellProps) => {
  const resolvedNotificationsHref =
    notificationsHref ?? `/org/${orgSlug}/notifications`
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [notifications, setNotifications] =
    useState<NotificationDto[]>(initialNotifications)
  const [open, setOpen] = useState(false)
  const [isFetchingList, setIsFetchingList] = useState(false)

  const fetchRecentNotifications = useCallback(async () => {
    setIsFetchingList(true)
    try {
      const response = await fetch('/api/notifications/recent')
      if (!response.ok) return

      const data = (await response.json()) as NotificationDto[]
      setNotifications(data)
    } catch {
      // Silenciar erros de rede
    } finally {
      setIsFetchingList(false)
    }
  }, [])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (isOpen) {
        void fetchRecentNotifications()
      }
    },
    [fetchRecentNotifications],
  )

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (document.visibilityState !== 'visible') return

      try {
        const response = await fetch('/api/notifications/unread-count')
        if (!response.ok) return

        const data = (await response.json()) as { count: number }
        setUnreadCount(data.count)
      } catch {
        // Silenciar erros de rede no polling
      }
    }

    const intervalId = setInterval(fetchUnreadCount, POLLING_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [])

  const { execute: executeMarkAsRead } = useAction(markNotificationAsRead, {
    onSuccess: () => {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao marcar notificação como lida.')
    },
  })

  const { execute: executeMarkAllAsRead, isPending: isPendingMarkAll } =
    useAction(markAllNotificationsAsRead, {
      onSuccess: () => {
        setUnreadCount(0)
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, readAt: new Date() })),
        )
        toast.success('Todas as notificações foram marcadas como lidas.')
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError ?? 'Erro ao marcar todas as notificações.',
        )
      },
    })

  const handleNotificationClick = useCallback(
    (notification: NotificationDto) => {
      if (!notification.readAt) {
        executeMarkAsRead({ notificationId: notification.id })
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? { ...item, readAt: new Date() }
              : item,
          ),
        )
      }

      if (notification.actionUrl) {
        setOpen(false)
        router.push(notification.actionUrl)
      }
    },
    [executeMarkAsRead, router],
  )

  const displayCount = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {displayCount}
            </span>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="mt-3 w-96 border-none bg-primary-dark p-0"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="font-semibold text-primary-foreground">
            Notificações
          </h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary-foreground hover:text-foreground"
              onClick={() => executeMarkAllAsRead(undefined)}
              disabled={isPendingMarkAll}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <Separator className="bg-primary/50" />

        <ScrollArea className="max-h-[400px]">
          {isFetchingList && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Bell className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-primary-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => {
                const variant = resolveNotificationVariant(notification)
                const isAlert = variant === 'alert'

                return (
                  <button
                    key={notification.id}
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-5 text-left transition-colors hover:bg-primary/20',
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="min-w-0 flex-1 gap-1">
                      <div className="mt-0.5 flex gap-2">
                        <NotificationVariantIcon notification={notification} />
                        <p className="text-sm font-semibold leading-none text-kronos-purple-light">
                          {notification.title}
                        </p>
                      </div>

                      <p className="mt-1 line-clamp-1 text-xs text-primary-foreground/60">
                        {notification.body}
                      </p>
                      <p className="mt-1 text-[10px] text-primary-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>

                    {!notification.readAt && (
                      <div
                        className={cn(
                          'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                          isAlert ? 'bg-amber-500' : 'bg-blue-500',
                        )}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator className="bg-primary/50" />
            <div className="p-0">
              <Button
                variant="ghost"
                size="default"
                className="w-full py-8 text-xs text-primary-foreground hover:bg-transparent hover:text-primary"
                asChild
              >
                <Link href={resolvedNotificationsHref}>Ver todas</Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
