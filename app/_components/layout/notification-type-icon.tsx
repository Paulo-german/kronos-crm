import { AlertTriangle, UserCheck, Megaphone } from 'lucide-react'
import type { NotificationType } from '@prisma/client'

interface NotificationTypeIconConfig {
  icon: React.ComponentType<{ className?: string }>
  className: string
}

const NOTIFICATION_TYPE_ICON_MAP: Record<NotificationType, NotificationTypeIconConfig> = {
  SYSTEM: {
    icon: AlertTriangle,
    className: 'text-amber-500',
  },
  USER_ACTION: {
    icon: UserCheck,
    className: 'text-blue-500',
  },
  PLATFORM_ANNOUNCEMENT: {
    icon: Megaphone,
    className: 'text-purple-500',
  },
}

interface NotificationTypeIconProps {
  type: NotificationType
  className?: string
}

export const NotificationTypeIcon = ({ type, className }: NotificationTypeIconProps) => {
  const config = NOTIFICATION_TYPE_ICON_MAP[type]
  const Icon = config.icon

  return <Icon className={`size-4 flex-shrink-0 ${config.className} ${className ?? ''}`} />
}
