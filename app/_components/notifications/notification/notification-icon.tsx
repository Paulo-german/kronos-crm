'use client'

import { cn } from '@/_lib/utils'
import { useNotification } from './notification-context'

interface NotificationIconProps {
  className?: string
}

/**
 * Ícone da variant da notificação: colorido conforme a variant quando não lida,
 * esmaecido (muted) quando já lida. A bolinha de status fica sobreposta no canto
 * superior esquerdo, com anel na cor do fundo para o efeito de máscara.
 */
export const NotificationIcon = ({ className }: NotificationIconProps) => {
  const { config, isUnread } = useNotification()
  const Icon = config.icon

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <Icon
        className={cn(
          'size-5',
          isUnread ? config.iconColor : 'text-muted-foreground',
        )}
      />
      <span
        className={cn(
          'absolute -left-1 -top-1 size-2.5 rounded-full ring-2 ring-background',
          isUnread ? 'bg-kronos-green' : 'bg-muted',
        )}
        aria-label={isUnread ? 'Não lida' : 'Lida'}
      />
    </span>
  )
}
