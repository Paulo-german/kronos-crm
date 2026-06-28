import 'server-only'

import { db } from '@/_lib/prisma'
import { redactPiiInText } from '@/_lib/pii-mask'
import type {
  ConversationEventType,
  ConversationEventDto,
} from '@/_lib/conversation-events/types'

// Limite alto: simulações são curtas, mas queremos o turno inteiro sem paginação.
const DEBUG_FETCH_LIMIT = 500
const PREVIEW_MAX_LENGTH = 140

export type SimulatorDebugEntry =
  | {
      id: string
      kind: 'message'
      createdAt: string
      role: string
      preview: string
    }
  | ({
      id: string
      kind: 'event'
      createdAt: string
    } & Omit<ConversationEventDto, 'id' | 'createdAt'>)

function truncate(text: string): string {
  if (text.length <= PREVIEW_MAX_LENGTH) return text
  return `${text.slice(0, PREVIEW_MAX_LENGTH)}…`
}

// Segurança: NÃO devolvemos o metadata bruto do evento (pode conter IDs internos,
// payloads, detalhes de erro). Só liberamos as chaves seguras que a UI realmente usa.
const SAFE_METADATA_KEYS = ['subtype'] as const

function sanitizeEventMetadata(
  metadata: unknown,
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object') return null
  const source = metadata as Record<string, unknown>
  const safe: Record<string, unknown> = {}
  for (const key of SAFE_METADATA_KEYS) {
    if (typeof source[key] === 'string') safe[key] = source[key]
  }
  return Object.keys(safe).length > 0 ? safe : null
}

/**
 * Timeline de debug do simulador: mescla mensagens e TODOS os ConversationEvents
 * (inclusive os com `visibleToUser: false` — tools internos, steps), em ordem
 * cronológica, para inspeção do que o agente fez por turno. Exclusivo do simulador.
 */
export async function getSimulatorDebugTimeline(
  conversationId: string,
): Promise<SimulatorDebugEntry[]> {
  const [events, messages] = await Promise.all([
    db.conversationEvent.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: DEBUG_FETCH_LIMIT,
      select: {
        id: true,
        type: true,
        toolName: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    }),
    db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: DEBUG_FETCH_LIMIT,
      select: { id: true, role: true, content: true, createdAt: true },
    }),
  ])

  const eventEntries: SimulatorDebugEntry[] = events.map((event) => ({
    id: event.id,
    kind: 'event',
    createdAt: event.createdAt.toISOString(),
    type: event.type as ConversationEventType,
    toolName: event.toolName,
    // Redige PII embutida no texto descritivo do evento antes de ir ao client.
    content: redactPiiInText(event.content) ?? event.content,
    metadata: sanitizeEventMetadata(event.metadata),
  }))

  const messageEntries: SimulatorDebugEntry[] = messages.map((message) => ({
    id: message.id,
    kind: 'message',
    createdAt: message.createdAt.toISOString(),
    role: message.role,
    preview: truncate(message.content),
  }))

  return [...messageEntries, ...eventEntries].sort((first, second) =>
    first.createdAt.localeCompare(second.createdAt),
  )
}
