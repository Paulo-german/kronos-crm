'use client'

import { cn } from '@/_lib/utils'

interface NotificationContentProps {
  className?: string
  children: React.ReactNode
}

/** Coluna de conteúdo ao lado do ícone — abrange texto e ações. */
export const NotificationContent = ({
  className,
  children,
}: NotificationContentProps) => {
  return <div className={cn('min-w-0 flex-1', className)}>{children}</div>
}
