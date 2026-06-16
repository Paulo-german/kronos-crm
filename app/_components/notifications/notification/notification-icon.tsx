'use client'

import { cn } from '@/_lib/utils'
import { useNotification } from './notification-context'

interface NotificationIconProps {
  className?: string
}

/** Ícone da variant da notificação (alert/assignment/actionable/info). */
export const NotificationIcon = ({ className }: NotificationIconProps) => {
  const { config } = useNotification()
  const Icon = config.icon

  return (
    <Icon className={cn('size-4 flex-shrink-0', config.iconColor, className)} />
  )
}
