import type { BroadcastStatus, BroadcastRecipientStatus } from '@prisma/client'
import { cn } from '@/_lib/utils'
import {
  STATUS_LABELS,
  RECIPIENT_STATUS_LABELS,
} from '../_lib/broadcast-labels'

const STATUS_STYLES: Record<BroadcastStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SCHEDULED: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  RUNNING: 'bg-kronos-orange/15 text-kronos-orange',
  COMPLETED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  CANCELLED: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  FAILED: 'bg-destructive/15 text-destructive',
}

interface BroadcastStatusBadgeProps {
  status: BroadcastStatus
  className?: string
}

export const BroadcastStatusBadge = ({
  status,
  className,
}: BroadcastStatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold',
        STATUS_STYLES[status],
        className,
      )}
    >
      {status === 'RUNNING' && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kronos-orange opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-kronos-orange" />
        </span>
      )}
      {STATUS_LABELS[status]}
    </span>
  )
}

const RECIPIENT_STATUS_STYLES: Record<BroadcastRecipientStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  SENDING: 'bg-kronos-orange/15 text-kronos-orange',
  SENT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  FAILED: 'bg-destructive/15 text-destructive',
  SKIPPED: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
}

interface RecipientStatusBadgeProps {
  status: BroadcastRecipientStatus
  className?: string
}

export const RecipientStatusBadge = ({
  status,
  className,
}: RecipientStatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        RECIPIENT_STATUS_STYLES[status],
        className,
      )}
    >
      {RECIPIENT_STATUS_LABELS[status]}
    </span>
  )
}
