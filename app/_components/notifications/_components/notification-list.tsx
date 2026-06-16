'use client'

import { useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import type { NotificationCategory } from '@prisma/client'
import { NotificationCard } from './notification-card'
import {
  NotificationFilters,
  ALL_CATEGORIES,
  type CategoryFilter,
} from './notification-filters'
import { getOrderedCategories } from '@/_lib/notifications/notification-category'
import type { NotificationDto } from '@/_data-access/notification/types'

interface NotificationListProps {
  notifications: NotificationDto[]
}

const buildEmptyCounts = (): Record<NotificationCategory, number> =>
  Object.fromEntries(
    getOrderedCategories().map((category) => [category, 0]),
  ) as Record<NotificationCategory, number>

export const NotificationList = ({ notifications }: NotificationListProps) => {
  const [items, setItems] = useState<NotificationDto[]>(notifications)
  const [filter, setFilter] = useState<CategoryFilter>(ALL_CATEGORIES)

  const counts = useMemo(() => {
    const result = buildEmptyCounts()
    for (const notification of items) {
      if (notification.category) result[notification.category] += 1
    }
    return result
  }, [items])

  const visibleItems =
    filter === ALL_CATEGORIES
      ? items
      : items.filter((notification) => notification.category === filter)

  const handleDeleted = (id: string) => {
    setItems((prev) => prev.filter((notification) => notification.id !== id))
  }

  const handleMarkedAsRead = (id: string) => {
    setItems((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, readAt: new Date() }
          : notification,
      ),
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Bell className="size-10 text-muted-foreground/40" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma notificação por enquanto
          </p>
          <p className="text-xs text-muted-foreground/60">
            Você será notificado sobre transferências, atribuições e comunicados
            da plataforma.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <NotificationFilters
        counts={counts}
        total={items.length}
        value={filter}
        onValueChange={setFilter}
      />

      <div className="space-y-3">
        {visibleItems.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onDeleted={handleDeleted}
            onMarkedAsRead={handleMarkedAsRead}
          />
        ))}
      </div>
    </div>
  )
}
