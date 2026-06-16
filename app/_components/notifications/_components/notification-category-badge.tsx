import type { NotificationCategory } from '@prisma/client'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { getCategoryConfig } from '@/_lib/notifications/notification-category'

interface NotificationCategoryBadgeProps {
  category: NotificationCategory | null
  className?: string
}

/**
 * Chip da categoria editorial da notificação.
 * Tolera `category` null (registros pré-backfill) — não renderiza nada.
 */
export const NotificationCategoryBadge = ({
  category,
  className,
}: NotificationCategoryBadgeProps) => {
  if (!category) return null

  const config = getCategoryConfig(category)
  const Icon = config.icon

  return (
    <Badge
      variant="secondary"
      className={cn(
        'shrink-0 gap-1 border-transparent text-[10px] font-medium',
        config.chipColor,
        className,
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}
