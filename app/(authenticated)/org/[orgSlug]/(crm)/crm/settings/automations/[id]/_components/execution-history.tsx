'use client'

import { useState } from 'react'
import { Badge, type BadgeProps } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  CheckCircle2Icon,
  XCircleIcon,
  SkipForwardIcon,
  ClockIcon,
  MessageCircleIcon,
  AlertCircleIcon,
} from 'lucide-react'
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

interface WhatsAppResult {
  sent: number
  failed: number
  skipped: number
}

function parseWhatsAppResult(
  actionResult: Record<string, unknown> | null,
): WhatsAppResult | null {
  if (!actionResult) return null
  const whatsapp = actionResult.whatsapp
  if (!whatsapp || typeof whatsapp !== 'object') return null
  const whatsappResult = whatsapp as Record<string, unknown>
  if (
    typeof whatsappResult.sent !== 'number' &&
    typeof whatsappResult.failed !== 'number' &&
    typeof whatsappResult.skipped !== 'number'
  )
    return null
  return {
    sent: typeof whatsappResult.sent === 'number' ? whatsappResult.sent : 0,
    failed:
      typeof whatsappResult.failed === 'number' ? whatsappResult.failed : 0,
    skipped:
      typeof whatsappResult.skipped === 'number' ? whatsappResult.skipped : 0,
  }
}

function WhatsAppSummary({ result }: { result: WhatsAppResult }) {
  const hasIssue =
    result.failed > 0 || (result.skipped > 0 && result.sent === 0)

  return (
    <span
      className={`flex items-center gap-1 text-xs ${hasIssue ? 'text-amber-600' : 'text-muted-foreground'}`}
    >
      {hasIssue ? (
        <AlertCircleIcon className="h-3 w-3 shrink-0" />
      ) : (
        <MessageCircleIcon className="h-3 w-3 shrink-0" />
      )}
      WhatsApp:
      {result.sent > 0 && (
        <span className="text-emerald-600">
          {result.sent} enviado{result.sent > 1 ? 's' : ''}
        </span>
      )}
      {result.failed > 0 && (
        <span className="text-destructive">
          {result.failed} falha{result.failed > 1 ? 's' : ''}
        </span>
      )}
      {result.skipped > 0 && (
        <span>
          {result.skipped} ignorado{result.skipped > 1 ? 's' : ''}
          {result.sent === 0 && result.failed === 0 && (
            <span className="text-amber-600">
              {' '}
              — verifique telefone do usuário e inbox ativo
            </span>
          )}
        </span>
      )}
    </span>
  )
}

interface ExecutionHistoryProps {
  executions: Execution[]
  orgSlug: string
}

export function ExecutionHistory({
  executions,
  orgSlug,
}: ExecutionHistoryProps) {
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
          <p className="text-sm text-muted-foreground">
            Nenhuma execução encontrada.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExecutions.map((execution) => {
            const config = STATUS_CONFIG[execution.status]
            const whatsapp = parseWhatsAppResult(execution.actionResult)
            return (
              <div
                key={execution.id}
                className="flex items-start gap-3 rounded-md border bg-card p-3"
              >
                <div className="mt-0.5 shrink-0">{config.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={config.variant} className="text-xs">
                      {config.label}
                    </Badge>
                    {execution.deal && (
                      <Link
                        href={`/org/${orgSlug}/crm/deals/${execution.deal.id}`}
                        className="truncate text-sm font-medium hover:underline"
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
                    <p className="mt-1 text-xs text-destructive">
                      {execution.errorMessage}
                    </p>
                  )}
                  {whatsapp && (
                    <div className="mt-1">
                      <WhatsAppSummary result={whatsapp} />
                    </div>
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
