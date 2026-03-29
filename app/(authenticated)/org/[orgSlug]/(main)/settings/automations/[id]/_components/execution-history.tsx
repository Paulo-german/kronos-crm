'use client'

import { useState } from 'react'
import { Badge, type BadgeProps } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { CheckCircle2Icon, XCircleIcon, SkipForwardIcon, ClockIcon } from 'lucide-react'
import Link from 'next/link'
import type { AutomationDetailDto } from '@/_data-access/automation/get-automation-by-id'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AutomationExecutionStatus } from '@prisma/client'

type Execution = AutomationDetailDto['executions'][number]

type StatusFilter = AutomationExecutionStatus | 'ALL'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'SUCCESS', label: 'Sucesso' },
  { value: 'FAILED', label: 'Falha' },
  { value: 'SKIPPED', label: 'Ignoradas' },
]

const STATUS_CONFIG: Record<
  AutomationExecutionStatus,
  { icon: React.ReactNode; variant: BadgeProps['variant']; label: string }
> = {
  SUCCESS: {
    icon: <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />,
    variant: 'outline',
    label: 'Sucesso',
  },
  FAILED: {
    icon: <XCircleIcon className="h-4 w-4 text-destructive" />,
    variant: 'destructive',
    label: 'Falha',
  },
  SKIPPED: {
    icon: <SkipForwardIcon className="h-4 w-4 text-muted-foreground" />,
    variant: 'secondary',
    label: 'Ignorada',
  },
}

interface ExecutionHistoryProps {
  executions: Execution[]
  orgSlug: string
}

export function ExecutionHistory({ executions, orgSlug }: ExecutionHistoryProps) {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL')

  const filteredExecutions =
    activeFilter === 'ALL'
      ? executions
      : executions.filter((execution) => execution.status === activeFilter)

  return (
    <div className="space-y-4">
      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={activeFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Lista de execuções */}
      {filteredExecutions.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
          <p className="text-sm text-muted-foreground">Nenhuma execução encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExecutions.map((execution) => {
            const config = STATUS_CONFIG[execution.status]
            return (
              <div
                key={execution.id}
                className="flex items-start gap-3 rounded-md border bg-card p-3"
              >
                <div className="mt-0.5 shrink-0">{config.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={config.variant} className="text-xs">
                      {config.label}
                    </Badge>
                    {execution.deal && (
                      <Link
                        href={`/org/${orgSlug}/deals/${execution.deal.id}`}
                        className="text-sm font-medium hover:underline truncate"
                      >
                        {execution.deal.title}
                      </Link>
                    )}
                    {execution.durationMs !== null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ClockIcon className="h-3 w-3" />
                        {execution.durationMs}ms
                      </span>
                    )}
                  </div>
                  {execution.errorMessage && (
                    <p className="mt-1 text-xs text-destructive">{execution.errorMessage}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(execution.executedAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
