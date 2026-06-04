'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { NotificationCard } from './notification-card'
import type { NotificationDto } from '@/_data-access/notification/types'

interface NotificationListProps {
  notifications: NotificationDto[]
}

export const NotificationList = ({ notifications }: NotificationListProps) => {
  const [items, setItems] = useState<NotificationDto[]>(notifications)

  const handleDeleted = (id: string) => {
    setItems((prev) => prev.filter((notification) => notification.id !== id))
  }

  const handleMarkedAsRead = (id: string) => {
    setItems((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, readAt: new Date() } : notification,
      ),
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Bell className="size-10 text-muted-foreground/40" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Nenhuma notificação por enquanto</p>
          <p className="text-xs text-muted-foreground/60">
            Você será notificado sobre transferências, atribuições e comunicados da plataforma.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onDeleted={handleDeleted}
          onMarkedAsRead={handleMarkedAsRead}
        />
      ))}
    </div>
  )
}
