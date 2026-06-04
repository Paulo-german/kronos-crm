'use client'

import { Badge } from '@/_components/ui/badge'
import type { AgentExecutionStatus } from '@prisma/client'

interface ExecutionStatusBadgeProps {
  status: AgentExecutionStatus
}

const STATUS_CONFIG: Record<
  AgentExecutionStatus,
  { label: string; className: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }
> = {
  COMPLETED: {
    label: 'Concluído',
    className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200',
    variant: 'outline',
  },
  FAILED: {
    label: 'Falhou',
    className: '',
    variant: 'destructive',
  },
  SKIPPED: {
    label: 'Ignorado',
    className: '',
    variant: 'outline',
  },
}

export function ExecutionStatusBadge({ status }: ExecutionStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
