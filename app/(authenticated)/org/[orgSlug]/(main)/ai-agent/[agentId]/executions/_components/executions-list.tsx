'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  ActivityIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  ZapIcon,
  ClockIcon,
  CpuIcon,
  CoinsIcon,
  ListIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/_components/ui/collapsible'
import { ExecutionStatusBadge } from './execution-status-badge'
import { ExecutionTimeline } from './execution-timeline'
import {
  ExecutionFiltersSheet,
  ExecutionFilterBadges,
  useExecutionFilters,
} from './execution-filters'
import type {
  PaginatedAgentExecutions,
  AgentExecutionDto,
} from '@/_data-access/agent-execution/get-agent-executions'
import type { AgentExecutionDetailDto } from '@/_data-access/agent-execution/get-agent-execution-by-id'

// Mapeamento de modelId para label legível (espelhado de constants.ts)
const MODEL_LABEL_MAP: Record<string, string> = {
  'openai/gpt-5.2': 'GPT 5.2',
  'openai/gpt-4.1-mini': 'GPT 4.1 Mini',
  'google/gemini-2.5-pro': 'Gemini 2.5 Pro',
  'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
  'anthropic/claude-sonnet-4': 'Claude Sonnet 4',
}

function getModelLabel(modelId: string | null): string {
  if (!modelId) return '—'
  return MODEL_LABEL_MAP[modelId] ?? modelId.split('/').pop() ?? modelId
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

interface ExecutionCardProps {
  execution: AgentExecutionDto
  orgSlug: string
}

function ExecutionCard({ execution, orgSlug }: ExecutionCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [detailData, setDetailData] = useState<AgentExecutionDetailDto | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const totalTokens =
    (execution.inputTokens ?? 0) + (execution.outputTokens ?? 0)

  const handleToggle = async (open: boolean) => {
    setIsOpen(open)

    // Carrega os steps ao expandir pela primeira vez
    if (open && detailData === null && !isLoadingDetail) {
      setIsLoadingDetail(true)
      try {
        const response = await fetch(
          `/api/agent-executions/${execution.id}?orgSlug=${orgSlug}`,
        )
        if (response.ok) {
          const data = (await response.json()) as AgentExecutionDetailDto
          setDetailData(data)
        }
      } catch {
        // Falha silenciosa — o timeline simplesmente não mostra steps
      } finally {
        setIsLoadingDetail(false)
      }
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <Card className="overflow-hidden transition-colors hover:border-primary/30">
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full text-left">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Status + data/hora */}
                <div className="flex items-center gap-3">
                  <ExecutionStatusBadge status={execution.status} />
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(execution.startedAt)}
                  </span>
                </div>

                {/* Métricas */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ClockIcon size={12} />
                    <span>{formatDuration(execution.durationMs)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CpuIcon size={12} />
                    <span>{getModelLabel(execution.modelId)}</span>
                  </div>

                  {totalTokens > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ZapIcon size={12} />
                      <span>
                        {totalTokens.toLocaleString('pt-BR')} tokens
                      </span>
                    </div>
                  )}

                  {execution.creditsCost !== null &&
                    execution.creditsCost > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CoinsIcon size={12} />
                        <span>{execution.creditsCost} créditos</span>
                      </div>
                    )}

                  {execution.contactName && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UserIcon size={12} />
                      <Link
                        href={`/org/${orgSlug}/inbox?conversationId=${execution.conversationId}`}
                        className="hover:text-foreground hover:underline transition-colors"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {execution.contactName}
                      </Link>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ListIcon size={12} />
                    <span>{execution.stepsCount} steps</span>
                  </div>

                  <div className="ml-1 text-muted-foreground">
                    {isOpen ? (
                      <ChevronUpIcon size={14} />
                    ) : (
                      <ChevronDownIcon size={14} />
                    )}
                  </div>
                </div>
              </div>

              {execution.errorMessage && (
                <p className="mt-2 text-xs text-destructive bg-destructive/10 rounded px-2 py-1 font-mono">
                  {execution.errorMessage}
                </p>
              )}
            </CardContent>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t bg-muted/30 px-4 pb-4 pt-4">
            {isLoadingDetail && (
              <p className="text-sm text-muted-foreground">
                Carregando steps...
              </p>
            )}
            {!isLoadingDetail && detailData !== null && (
              <ExecutionTimeline steps={detailData.steps} />
            )}
            {!isLoadingDetail && detailData === null && isOpen && (
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar os detalhes desta execução.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

interface ExecutionsListProps {
  initialData: PaginatedAgentExecutions
  orgSlug: string
}

export default function ExecutionsList({
  initialData,
  orgSlug,
}: ExecutionsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const {
    filters,
    applyFilters,
    removeStatus,
    removeDates,
    clearAll,
    activeFilterCount,
    hasActiveFilters,
  } = useExecutionFilters()

  const currentPage = initialData.page

  // Polling client-side a cada 60s — sincronização com sistema externo (válido para useEffect)
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 60_000)

    return () => clearInterval(interval)
  }, [router])

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  const showEmptyState =
    initialData.executions.length === 0 && !hasActiveFilters && currentPage === 1

  if (showEmptyState) {
    return <EmptyState />
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: filtros + contador (mesma linha) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ExecutionFiltersSheet
            activeFilterCount={activeFilterCount}
            currentFilters={filters}
            onApply={applyFilters}
          />
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {initialData.total}
            </span>{' '}
            execuções
          </span>
        </div>

        <ExecutionFilterBadges
          filters={filters}
          onRemoveStatus={removeStatus}
          onRemoveDates={removeDates}
          onClearAll={clearAll}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Lista de execuções */}
      {initialData.executions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <ActivityIcon className="h-8 w-8 opacity-40" />
          <p className="text-sm">Nenhuma execução encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {initialData.executions.map((execution) => (
            <ExecutionCard
              key={execution.id}
              execution={execution}
              orgSlug={orgSlug}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {initialData.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Página{' '}
            <span className="font-medium text-foreground">{currentPage}</span>{' '}
            de{' '}
            <span className="font-medium text-foreground">
              {initialData.totalPages}
            </span>{' '}
            ({initialData.total} no total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= initialData.totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 py-16">
      <div className="rounded-full bg-muted p-4">
        <ActivityIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold">
          Nenhuma execução registrada ainda
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          As execuções aparecerão aqui após o agente processar mensagens.
        </p>
      </div>
    </div>
  )
}
