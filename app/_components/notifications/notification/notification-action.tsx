'use client'

import Link from 'next/link'
import { Loader2, type LucideIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { cn } from '@/_lib/utils'

interface NotificationActionProps {
  /** Rótulo do botão. */
  label: string
  icon?: LucideIcon
  /** Renderiza como link interno quando informado. */
  href?: string
  onClick?: (event: React.MouseEvent) => void
  variant?: React.ComponentProps<typeof Button>['variant']
  isPending?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Botão de ação genérico do compound. Reutilizável por `Notification.Actions`
 * (ações por variant) e pelos controles do card (marcar lida / excluir).
 */
export const NotificationAction = ({
  label,
  icon: Icon,
  href,
  onClick,
  variant = 'outline',
  isPending = false,
  disabled = false,
  className,
}: NotificationActionProps) => {
  const content = (
    <>
      {isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        Icon && <Icon className="size-3" />
      )}
      {label}
    </>
  )

  const stop = (event: React.MouseEvent) => {
    event.stopPropagation()
    onClick?.(event)
  }

  if (href) {
    return (
      <Button
        variant={variant}
        size="sm"
        className={cn('h-7 gap-1.5 px-3 text-xs', className)}
        asChild
        onClick={(event) => event.stopPropagation()}
      >
        <Link href={href}>{content}</Link>
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size="sm"
      className={cn('h-7 gap-1.5 px-3 text-xs', className)}
      onClick={stop}
      disabled={disabled || isPending}
    >
      {content}
    </Button>
  )
}
