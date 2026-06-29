'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Info,
  Loader2,
  Target,
  User,
  Wrench,
  XCircle,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import { ScrollArea } from '@/_components/ui/scroll-area'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import type { SimulatorDebugEntry } from '@/_data-access/conversation/get-simulator-debug-timeline'
import type { SimulatorDebugExecution } from '@/_data-access/conversation/get-simulator-debug-executions'

interface SimulatorDebugSheetProps {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CurrentStep {
  order: number
  name: string
}

interface DebugResponse {
  entries: SimulatorDebugEntry[]
  executions: SimulatorDebugExecution[]
  currentStep: CurrentStep | null
}

// Chunk de KB recuperado pela tool search_knowledge (shape do output).
interface KnowledgeChunk {
  content: string
  fileName: string
  similarity: number
}

function extractKnowledgeChunks(output: unknown): KnowledgeChunk[] {
  if (!output || typeof output !== 'object') return []
  const results = (output as { results?: unknown }).results
  if (!Array.isArray(results)) return []
  return results.filter(
    (item): item is KnowledgeChunk =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as KnowledgeChunk).content === 'string',
  )
}

type TimelineFilter = 'all' | 'tools' | 'errors'

// Formata o horário absoluto do evento (HH:mm:ss) em pt-BR.
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(ms: number | null): string {
  if (ms == null) return 'n/d'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// Latência entre dois passos consecutivos — dá a noção de quanto cada etapa demorou.
function formatDelta(
  currentIso: string,
  previousIso: string | null,
): string | null {
  if (!previousIso) return null
  const deltaMs =
    new Date(currentIso).getTime() - new Date(previousIso).getTime()
  if (deltaMs < 1000) return `+${deltaMs}ms`
  return `+${(deltaMs / 1000).toFixed(1)}s`
}

interface EventVisual {
  icon: typeof Info
  className: string
}

function resolveEventVisual(type: string): EventVisual {
  if (type === 'TOOL_SUCCESS')
    return { icon: CheckCircle2, className: 'text-emerald-500' }
  if (type === 'TOOL_FAILURE')
    return { icon: XCircle, className: 'text-red-500' }
  if (type === 'PROCESSING_ERROR')
    return { icon: AlertTriangle, className: 'text-red-500' }
  return { icon: Info, className: 'text-amber-500' }
}

function statusClassName(status: string): string {
  if (status === 'COMPLETED')
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
  if (status === 'FAILED') return 'border-red-500/20 bg-red-500/10 text-red-500'
  return 'border-amber-500/20 bg-amber-500/10 text-amber-500'
}

function entryToText(entry: SimulatorDebugEntry): string {
  const time = formatTime(entry.createdAt)
  if (entry.kind === 'message') {
    const role = entry.role === 'user' ? 'Cliente' : 'Agente'
    return `[${time}] ${role}: ${entry.preview}`
  }
  const label = entry.toolName ?? entry.type
  return `[${time}] ${label}: ${entry.content}`
}

function ExecutionCard({ execution }: { execution: SimulatorDebugExecution }) {
  const tokens =
    execution.inputTokens != null || execution.outputTokens != null
      ? `${execution.inputTokens ?? 0}→${execution.outputTokens ?? 0} tok`
      : null

  return (
    <div className="rounded-md border border-border/50 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <Badge
          variant="outline"
          className={cn(
            'h-5 px-1.5 text-[10px]',
            statusClassName(execution.status),
          )}
        >
          {execution.status}
        </Badge>
        <span>{formatDuration(execution.durationMs)}</span>
        {tokens && <span>· {tokens}</span>}
        {execution.creditsCost != null && (
          <span>· {execution.creditsCost} créd.</span>
        )}
        {execution.finishReason && <span>· {execution.finishReason}</span>}
      </div>

      {execution.errorMessage && (
        <p className="mt-1 break-words text-[11px] text-red-500">
          {execution.errorMessage}
        </p>
      )}

      {execution.steps.length > 0 && (
        <div className="mt-2 space-y-1">
          {execution.steps.map((step) => (
            <StepRow key={`${execution.id}-${step.order}`} step={step} />
          ))}
        </div>
      )}

      {execution.systemPrompt && (
        <SystemPromptBlock prompt={execution.systemPrompt} />
      )}
    </div>
  )
}

function SystemPromptBlock({ prompt }: { prompt: string }) {
  const [open, setOpen] = useState(false)
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 text-[10px] font-medium uppercase text-muted-foreground/70 hover:text-muted-foreground"
      >
        <Chevron className="h-3 w-3" />
        System prompt
      </button>
      {open && (
        <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-1.5 text-[10px] leading-relaxed text-muted-foreground">
          {prompt}
        </pre>
      )}
    </div>
  )
}

type DebugStep = SimulatorDebugExecution['steps'][number]

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null
  return (
    <div>
      <p className="text-[10px] font-medium uppercase text-muted-foreground/70">
        {label}
      </p>
      <pre className="mt-0.5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-1.5 text-[10px] leading-relaxed text-muted-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function KnowledgeChunks({ chunks }: { chunks: KnowledgeChunk[] }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase text-muted-foreground/70">
        Conhecimento ({chunks.length})
      </p>
      {chunks.map((chunk, index) => (
        <div key={index} className="rounded bg-muted/50 p-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{chunk.fileName}</span>
            <span className="ml-auto shrink-0 text-muted-foreground/60">
              {Math.round(chunk.similarity * 100)}%
            </span>
          </div>
          <p className="mt-0.5 line-clamp-3 break-words text-[10px] text-muted-foreground/80">
            {chunk.content}
          </p>
        </div>
      ))}
    </div>
  )
}

function StepRow({ step }: { step: DebugStep }) {
  const [open, setOpen] = useState(false)
  const hasDetail = step.input != null || step.output != null
  const knowledgeChunks =
    step.toolName === 'search_knowledge'
      ? extractKnowledgeChunks(step.output)
      : []
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div className="rounded bg-muted/40">
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-1 px-1.5 py-1 text-left text-[10px]',
          step.status === 'FAILED'
            ? 'text-red-500'
            : step.status === 'SKIPPED'
              ? 'text-muted-foreground/60'
              : 'text-muted-foreground',
          hasDetail && 'hover:bg-muted',
        )}
      >
        {hasDetail ? (
          <Chevron className="h-3 w-3 shrink-0" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="font-medium">{step.toolName ?? step.type}</span>
        {step.durationMs != null && (
          <span className="text-muted-foreground/50">
            {formatDuration(step.durationMs)}
          </span>
        )}
      </button>

      {open && hasDetail && (
        <div className="space-y-1.5 px-1.5 pb-1.5">
          {knowledgeChunks.length > 0 && (
            <KnowledgeChunks chunks={knowledgeChunks} />
          )}
          <JsonBlock label="input" value={step.input} />
          {knowledgeChunks.length === 0 && (
            <JsonBlock label="output" value={step.output} />
          )}
        </div>
      )}
    </div>
  )
}

function DebugRow({
  entry,
  previousIso,
}: {
  entry: SimulatorDebugEntry
  previousIso: string | null
}) {
  const delta = formatDelta(entry.createdAt, previousIso)

  if (entry.kind === 'message') {
    const isUser = entry.role === 'user'
    const Icon = isUser ? User : Bot
    return (
      <div className="flex gap-2.5 py-2">
        <Icon
          className={cn(
            'mt-0.5 h-3.5 w-3.5 shrink-0',
            isUser ? 'text-muted-foreground' : 'text-kronos-purple',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">
              {isUser ? 'Cliente' : 'Agente'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatTime(entry.createdAt)}
            </span>
            {delta && (
              <span className="text-[10px] text-muted-foreground/60">
                {delta}
              </span>
            )}
          </div>
          <p className="mt-0.5 break-words text-xs text-muted-foreground">
            {entry.preview}
          </p>
        </div>
      </div>
    )
  }

  const visual = resolveEventVisual(entry.type)
  const Icon = visual.icon
  const subtype =
    typeof entry.metadata?.subtype === 'string' ? entry.metadata.subtype : null
  const label = entry.toolName ?? subtype ?? entry.type

  return (
    <div className="flex gap-2.5 py-2">
      {entry.toolName ? (
        <Wrench
          className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', visual.className)}
        />
      ) : (
        <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', visual.className)} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-medium', visual.className)}>
            {label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(entry.createdAt)}
          </span>
          {delta && (
            <span className="text-[10px] text-muted-foreground/60">
              {delta}
            </span>
          )}
        </div>
        <p className="mt-0.5 break-words text-xs text-muted-foreground">
          {entry.content}
        </p>
      </div>
    </div>
  )
}

const FILTERS: { key: TimelineFilter; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'tools', label: 'Ferramentas' },
  { key: 'errors', label: 'Erros' },
]

function matchesFilter(
  entry: SimulatorDebugEntry,
  filter: TimelineFilter,
): boolean {
  if (filter === 'all') return true
  if (entry.kind === 'message') return false
  if (filter === 'tools') return !!entry.toolName
  return entry.type === 'PROCESSING_ERROR' || entry.type === 'TOOL_FAILURE'
}

export function SimulatorDebugSheet({
  conversationId,
  open,
  onOpenChange,
}: SimulatorDebugSheetProps) {
  const [filter, setFilter] = useState<TimelineFilter>('all')
  const [isExporting, setIsExporting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['simulator-debug', conversationId],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/inbox/${conversationId}/simulator-debug`,
        {
          signal,
        },
      )
      if (!response.ok) throw new Error('Failed to fetch debug timeline')
      return response.json() as Promise<DebugResponse>
    },
    enabled: open,
    // Atualiza enquanto o painel está aberto — o pipeline roda assíncrono.
    refetchInterval: open ? 2_000 : false,
    refetchIntervalInBackground: false,
  })

  const entries = data?.entries ?? []
  const executions = data?.executions ?? []
  const currentStep = data?.currentStep ?? null
  const filteredEntries = entries.filter((entry) =>
    matchesFilter(entry, filter),
  )

  // Execuções vêm ordenadas desc (mais recente primeiro) — banner usa a última.
  const lastExecution = executions[0]
  const failedExecution =
    lastExecution?.status === 'FAILED' ? lastExecution : null
  const totals = executions.reduce(
    (acc, execution) => ({
      inputTokens: acc.inputTokens + (execution.inputTokens ?? 0),
      outputTokens: acc.outputTokens + (execution.outputTokens ?? 0),
      credits: acc.credits + (execution.creditsCost ?? 0),
      durationMs: acc.durationMs + (execution.durationMs ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0, credits: 0, durationMs: 0 },
  )

  const handleCopy = async () => {
    if (entries.length === 0) return
    const text = entries.map(entryToText).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Trilha copiada.')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(
        `/api/inbox/${conversationId}/simulator-transcript`,
      )
      if (!response.ok) throw new Error('export failed')
      const blob = await response.blob()
      const filename =
        response.headers
          .get('Content-Disposition')
          ?.match(/filename="(.+)"/)?.[1] ?? 'simulacao.md'
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar transcript.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-[var(--kronos-cyan)]" />
              Debug do agente
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                disabled={entries.length === 0}
                title="Copiar trilha"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleExport}
                disabled={isExporting || entries.length === 0}
                title="Exportar transcript (.md)"
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
          <SheetDescription className="text-xs">
            Trilha do turno: mensagens, ferramentas, etapas e lifecycle, em
            ordem cronológica.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {currentStep && (
            <div className="flex items-center gap-1.5 border-b border-border/40 px-4 py-2 text-xs">
              <Target className="h-3.5 w-3.5 shrink-0 text-kronos-purple" />
              <span className="text-muted-foreground">Etapa atual:</span>
              <span className="font-medium">
                {currentStep.order} — {currentStep.name}
              </span>
            </div>
          )}

          {failedExecution && (
            <div className="flex gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">A última execução falhou.</p>
                {failedExecution.errorMessage && (
                  <p className="mt-0.5 break-words text-red-500/80">
                    {failedExecution.errorMessage}
                  </p>
                )}
              </div>
            </div>
          )}

          {executions.length > 0 && (
            <div className="space-y-2 border-b border-border/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Execuções ({executions.length})
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {totals.inputTokens}→{totals.outputTokens} tok ·{' '}
                  {totals.credits} créd · {formatDuration(totals.durationMs)}
                </p>
              </div>
              {executions.map((execution) => (
                <ExecutionCard key={execution.id} execution={execution} />
              ))}
            </div>
          )}

          <div className="flex gap-1.5 px-4 pt-3">
            {FILTERS.map((option) => (
              <Button
                key={option.key}
                variant={filter === option.key ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => setFilter(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="divide-y divide-border/40 px-4">
            {isLoading && entries.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Carregando trilha...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                {entries.length === 0
                  ? 'Nenhum evento ainda. Envie uma mensagem para o agente.'
                  : 'Nada neste filtro.'}
              </div>
            ) : (
              filteredEntries.map((entry, index) => (
                <DebugRow
                  key={`${entry.kind}-${entry.id}`}
                  entry={entry}
                  previousIso={
                    index > 0 ? filteredEntries[index - 1].createdAt : null
                  }
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
