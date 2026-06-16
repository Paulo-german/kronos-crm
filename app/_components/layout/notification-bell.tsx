'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, Loader2, Settings } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Button } from '@/_components/ui/button'
import { Separator } from '@/_components/ui/separator'
import { cn } from '@/_lib/utils'
import { NotificationCard } from '@/_components/notifications'
import { markAllNotificationsAsRead } from '@/_actions/notification/mark-all-as-read'
import type { NotificationDto } from '@/_data-access/notification/types'

const POLLING_INTERVAL_MS = 120_000

type NotificationFilter = 'unread' | 'read'

const FILTER_TABS: { value: NotificationFilter; label: string }[] = [
  { value: 'unread', label: 'Não lidas' },
  { value: 'read', label: 'Lidas' },
]

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
  // Preferências são por usuário — vivem na conta, fora do contexto de org/produto.
  const notificationSettingsHref = '/account/notifications'
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [notifications, setNotifications] =
    useState<NotificationDto[]>(initialNotifications)
  const [open, setOpen] = useState(false)
  const [isFetchingList, setIsFetchingList] = useState(false)
  const [filter, setFilter] = useState<NotificationFilter>('unread')

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

  const handleMarkedAsRead = useCallback((id: string) => {
    setUnreadCount((prev) => Math.max(0, prev - 1))
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, readAt: new Date() }
          : notification,
      ),
    )
  }, [])

  const handleDeleted = useCallback(
    (id: string) => {
      const target = notifications.find(
        (notification) => notification.id === id,
      )
      if (target && !target.readAt) {
        setUnreadCount((count) => Math.max(0, count - 1))
      }
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== id),
      )
    },
    [notifications],
  )

  const displayCount = unreadCount > 9 ? '9+' : String(unreadCount)

  const visibleNotifications = notifications.filter((notification) =>
    filter === 'unread' ? !notification.readAt : !!notification.readAt,
  )

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

      <PopoverContent align="end" className="mt-3 w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="font-semibold">Notificações</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto gap-1.5 p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => executeMarkAllAsRead(undefined)}
                  disabled={isPendingMarkAll}
                >
                  {isPendingMarkAll ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="size-3.5" />
                  )}
                  Marcar todas como lidas
                </Button>
                <Separator orientation="vertical" className="h-4" />
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link
                href={notificationSettingsHref}
                onClick={() => setOpen(false)}
              >
                <Settings className="size-4" />
                <span className="sr-only">Configurações de notificações</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b px-4">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={cn(
                '-mb-px border-b-2 border-transparent py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
                filter === tab.value && 'border-primary text-foreground',
              )}
            >
              {tab.label}
              {tab.value === 'unread' && unreadCount > 0 && (
                <span className="ml-1 text-muted-foreground">
                  ({displayCount})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {isFetchingList && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Bell className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {filter === 'unread'
                  ? 'Nenhuma notificação não lida'
                  : 'Nenhuma notificação lida'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {visibleNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  compact
                  onSelect={() => setOpen(false)}
                  onMarkedAsRead={handleMarkedAsRead}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <Separator />
            <Button
              variant="ghost"
              size="default"
              className="w-full rounded-none py-6 text-xs text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href={resolvedNotificationsHref}>Ver todas</Link>
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
