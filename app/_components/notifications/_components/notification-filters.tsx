'use client'

import type { NotificationCategory } from '@prisma/client'
import { Tabs, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import {
  getCategoryConfig,
  getOrderedCategories,
} from '@/_lib/notifications/notification-category'

export const ALL_CATEGORIES = 'all' as const

export type CategoryFilter = NotificationCategory | typeof ALL_CATEGORIES

interface NotificationFiltersProps {
  /** Contagem de notificações por categoria (já calculada na lista) */
  counts: Record<NotificationCategory, number>
  total: number
  value: CategoryFilter
  onValueChange: (value: CategoryFilter) => void
}

/**
 * Tabs de filtro por categoria. Só exibe as categorias com pelo menos uma
 * notificação na lista atual — evita abas vazias durante a transição.
 */
export const NotificationFilters = ({
  counts,
  total,
  value,
  onValueChange,
}: NotificationFiltersProps) => {
  const presentCategories = getOrderedCategories().filter(
    (category) => counts[category] > 0,
  )

  // Sem categorias resolvidas (tudo null pré-backfill) — não mostra filtro
  if (presentCategories.length === 0) return null

  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as CategoryFilter)}
    >
      <TabsList className="grid h-12 w-full grid-cols-[repeat(auto-fit,minmax(0,1fr))] border border-border/50 bg-tab/30">
        <TabsTrigger value={ALL_CATEGORIES}>Todas ({total})</TabsTrigger>
        {presentCategories.map((category) => (
          <TabsTrigger key={category} value={category}>
            {getCategoryConfig(category).label} ({counts[category]})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
