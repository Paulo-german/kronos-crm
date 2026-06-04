'use client'

import { useEffect, useRef } from 'react'
import {
  Bot,
  User,
  Loader2,
  ArrowRightLeft,
  UserPen,
  FileEdit,
  ListTodo,
  CalendarSearch,
  CalendarPlus,
  CalendarClock,
  BookOpen,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { ScrollArea } from '@/_components/ui/scroll-area'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import type { UIMessage } from 'ai'

// Extrai o texto de uma mensagem UIMessage do AI SDK v6
// (as mensagens usam `parts` ao invés do antigo campo `content`)
function extractMessageText(message: UIMessage): string {
  const textPart = message.parts.find((part) => part.type === 'text')
  if (textPart && 'text' in textPart) {
    return textPart.text
  }
  return ''
}

// ---------------------------------------------------------------------------
// Mapeamento tool name → ícone Lucide + label pt-BR
// ---------------------------------------------------------------------------
const TOOL_UI_MAP: Record<string, { icon: LucideIcon; label: string }> = {
  move_deal: { icon: ArrowRightLeft, label: 'Mover Negócio' },
  update_contact: { icon: UserPen, label: 'Atualizar Contato' },
  update_deal: { icon: FileEdit, label: 'Atualizar Negócio' },
  create_task: { icon: ListTodo, label: 'Criar Tarefa' },
  list_availability: { icon: CalendarSearch, label: 'Consultar Disponibilidade' },
  create_event: { icon: CalendarPlus, label: 'Criar Evento' },
  update_event: { icon: CalendarClock, label: 'Reagendar Evento' },
  search_knowledge: { icon: BookOpen, label: 'Buscar Conhecimento' },
  hand_off_to_human: { icon: UserCheck, label: 'Transferir para Humano' },
}

/**
 * Extrai o nome da tool a partir do part.type (ex: "tool-move_deal" → "move_deal")
 */
function getToolName(partType: string): string {
  return partType.startsWith('tool-') ? partType.slice(5) : partType
}

/**
 * Formata os params de input em pares key: value legíveis
 */
function formatInputParams(input: unknown): Array<{ key: string; value: string }> {
  if (!input || typeof input !== 'object') return []
  return Object.entries(input as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }))
}

// ---------------------------------------------------------------------------
// ToolActionCard — renderiza tool call como card visual inline
// ---------------------------------------------------------------------------
interface ToolActionCardProps {
  part: {
    type: string
    state?: string
    input?: unknown
    output?: unknown
    errorText?: string
  }
}

function ToolActionCard({ part }: ToolActionCardProps) {
  const toolName = getToolName(part.type)
  const toolUi = TOOL_UI_MAP[toolName]
  const Icon = toolUi?.icon ?? BookOpen
  const label = toolUi?.label ?? toolName

  const isExecuting =
    part.state === 'input-available' || part.state === 'input-streaming'
  const isError = part.state === 'output-error'
  const isComplete = part.state === 'output-available'

  // Determinar se é simulado (mock tools retornam simulated: true)
  const isSimulated =
    isComplete &&
    !!part.output &&
    typeof part.output === 'object' &&
    'simulated' in (part.output as Record<string, unknown>) &&
    (part.output as Record<string, unknown>).simulated === true

  const params = formatInputParams(part.input)

  return (
    <div className="my-1 max-w-[80%] rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      {/* Header: ícone + label + badge de estado */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            {label}
          </span>
        </div>

        {isExecuting && (
          <Badge
            variant="outline"
            className="gap-1 px-1.5 py-0 text-[10px]"
          >
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Executando...
          </Badge>
        )}

        {isSimulated && (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-600 dark:text-emerald-400"
          >
            Simulado
          </Badge>
        )}

        {isComplete && !isSimulated && (
          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 px-1.5 py-0 text-[10px] text-blue-600 dark:text-blue-400"
          >
            Executado
          </Badge>
        )}

        {isError && (
          <Badge
            variant="destructive"
            className="px-1.5 py-0 text-[10px]"
          >
            Erro
          </Badge>
        )}
      </div>

      {/* Params: key-value pairs */}
      {params.length > 0 && (isComplete || isError) && (
        <div className="mt-1.5 space-y-0.5">
          {params.map(({ key, value }) => (
            <div
              key={key}
              className="flex items-baseline gap-1 text-[11px] leading-tight"
            >
              <span className="shrink-0 text-muted-foreground">{key}:</span>
              <span className="break-all text-foreground/80">
                {value.length > 120 ? `${value.slice(0, 120)}…` : value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Error text */}
      {isError && part.errorText && (
        <p className="mt-1 text-[11px] text-destructive">{part.errorText}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TestChatMessages — componente principal
// ---------------------------------------------------------------------------
interface TestChatMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
}

const TestChatMessages = ({ messages, isLoading }: TestChatMessagesProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll para o final quando novas mensagens chegam.
  // Acessa o Viewport interno do Radix ScrollArea via data-attribute
  // ao invés de scrollIntoView, que borbulha para ancestrais e causa
  // o salto da página inteira.
  useEffect(() => {
    const root = scrollAreaRef.current
    if (!root) return
    const viewport = root.querySelector<HTMLDivElement>(
      '[data-radix-scroll-area-viewport]',
    )
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [messages, isLoading])

  // Filtra apenas mensagens de user e assistant visíveis (sem system)
  const visibleMessages = messages.filter(
    (message) => message.role === 'user' || message.role === 'assistant',
  )

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1">
      <div
        role="log"
        aria-live="polite"
        aria-label="Mensagens do chat de teste"
        className="flex flex-col gap-3 p-4"
      >
        {visibleMessages.map((message) => {
          const isUser = message.role === 'user'
          const text = extractMessageText(message)
          const hasToolParts = message.parts.some((part) =>
            part.type.startsWith('tool-'),
          )

          // Pula mensagens vazias (sem texto E sem tool parts)
          if (!text && !hasToolParts) return null

          return (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-2.5',
                isUser ? 'flex-row-reverse' : 'flex-row',
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[var(--kronos-purple)]/10 text-[var(--kronos-purple)]',
                )}
              >
                {isUser ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Conteúdo: texto + tool cards */}
              <div className={cn('max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
                {message.parts.map((part, index) => {
                  if (part.type === 'text' && 'text' in part && part.text) {
                    return (
                      <div
                        key={index}
                        className={cn(
                          'rounded-2xl px-3.5 py-2.5 text-sm',
                          isUser
                            ? 'rounded-tr-sm bg-muted text-foreground'
                            : 'rounded-tl-sm bg-[var(--kronos-purple)]/5 text-foreground',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {part.text}
                        </p>
                      </div>
                    )
                  }

                  if (part.type.startsWith('tool-')) {
                    return (
                      <ToolActionCard
                        key={index}
                        part={part as ToolActionCardProps['part']}
                      />
                    )
                  }

                  return null
                })}
              </div>
            </div>
          )
        })}

        {/* Indicador de streaming/loading */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--kronos-purple)]/10 text-[var(--kronos-purple)]">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-[var(--kronos-purple)]/5 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Respondendo...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Âncora para auto-scroll (espaço no final) */}
        <div aria-hidden />
      </div>
    </ScrollArea>
  )
}

export default TestChatMessages
