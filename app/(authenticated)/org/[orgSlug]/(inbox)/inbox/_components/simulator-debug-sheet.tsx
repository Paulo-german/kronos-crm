'use client'

import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Info,
  Loader2,
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
import { cn } from '@/_lib/utils'
import type { SimulatorDebugEntry } from '@/_data-access/conversation/get-simulator-debug-timeline'

interface SimulatorDebugSheetProps {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DebugResponse {
  entries: SimulatorDebugEntry[]
}

// Formata o horário absoluto do evento (HH:mm:ss) em pt-BR.
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
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

export function SimulatorDebugSheet({
  conversationId,
  open,
  onOpenChange,
}: SimulatorDebugSheetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['simulator-debug', conversationId],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/inbox/${conversationId}/simulator-debug`,
        { signal },
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/50 px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-[var(--kronos-cyan)]" />
            Debug do agente
          </SheetTitle>
          <SheetDescription className="text-xs">
            Trilha do turno: mensagens, ferramentas, etapas e lifecycle, em
            ordem cronológica.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-border/40 px-4">
            {isLoading && entries.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Carregando trilha...
              </div>
            ) : entries.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Nenhum evento ainda. Envie uma mensagem para o agente.
              </div>
            ) : (
              entries.map((entry, index) => (
                <DebugRow
                  key={`${entry.kind}-${entry.id}`}
                  entry={entry}
                  previousIso={index > 0 ? entries[index - 1].createdAt : null}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
