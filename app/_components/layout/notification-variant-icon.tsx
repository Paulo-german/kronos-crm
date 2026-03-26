import { getNotificationConfig } from '@/_lib/notifications/notification-variant'
import type { NotificationVariantInput } from '@/_lib/notifications/notification-variant'

interface NotificationVariantIconProps {
  notification: NotificationVariantInput
  className?: string
}

export const NotificationVariantIcon = ({
  notification,
  className,
}: NotificationVariantIconProps) => {
  const config = getNotificationConfig(notification)
  const Icon = config.icon

  return (
    <Icon
      className={`size-4 flex-shrink-0 ${config.iconColor} ${className ?? ''}`}
    />
  )
}
