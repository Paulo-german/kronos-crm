// ⚠️ MOCK — dados fictícios para validação visual do Kronos Prospection.
// Substituir por data-access real (Prisma) na fase de backend.
// Os tipos abaixo espelham o schema definido em PLAN-broadcasts.md.

export type BroadcastStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'

export type BroadcastConnectionType = 'EVOLUTION' | 'META_CLOUD' | 'Z_API'

export type BroadcastRecipientStatus =
  | 'PENDING'
  | 'SENDING'
  | 'SENT'
  | 'FAILED'
  | 'SKIPPED'

export interface MockBroadcast {
  id: string
  name: string
  inboxName: string
  connectionType: BroadcastConnectionType
  messageContent: string
  throttleMs: number
  status: BroadcastStatus
  totalRecipients: number
  sentCount: number
  failedCount: number
  scheduledFor: string | null
  startedAt: string | null
  completedAt: string | null
  createdByName: string
  createdAt: string
}

export interface MockBroadcastRecipient {
  id: string
  contactName: string
  phoneSnapshot: string
  status: BroadcastRecipientStatus
  errorMessage: string | null
  attempts: number
  sentAt: string | null
}

export const CONNECTION_LABELS: Record<BroadcastConnectionType, string> = {
  EVOLUTION: 'Evolution API',
  META_CLOUD: 'Meta Cloud',
  Z_API: 'Z-API',
}

export const STATUS_LABELS: Record<BroadcastStatus, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendado',
  RUNNING: 'Enviando',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  FAILED: 'Falhou',
}

export const RECIPIENT_STATUS_LABELS: Record<BroadcastRecipientStatus, string> =
  {
    PENDING: 'Na fila',
    SENDING: 'Enviando',
    SENT: 'Entregue',
    FAILED: 'Falhou',
    SKIPPED: 'Ignorado',
  }

// Inboxes elegíveis (mock) para o seletor de origem do disparo.
export const MOCK_INBOXES: {
  id: string
  name: string
  connectionType: BroadcastConnectionType
}[] = [
  { id: 'inbox-1', name: 'WhatsApp Comercial', connectionType: 'EVOLUTION' },
  { id: 'inbox-2', name: 'WhatsApp Suporte', connectionType: 'META_CLOUD' },
  { id: 'inbox-3', name: 'WhatsApp Vendas SP', connectionType: 'Z_API' },
]

export const MOCK_BROADCASTS: MockBroadcast[] = [
  {
    id: 'bc-001',
    name: 'Black Friday — Leads frios',
    inboxName: 'WhatsApp Comercial',
    connectionType: 'EVOLUTION',
    messageContent:
      'Oi {{nome}}! 🔥 A Black Friday chegou: 40% OFF em todos os planos só até sexta. Quer que eu te mande os detalhes?',
    throttleMs: 1500,
    status: 'RUNNING',
    totalRecipients: 1240,
    sentCount: 612,
    failedCount: 18,
    scheduledFor: null,
    startedAt: '2026-06-22T13:05:00.000Z',
    completedAt: null,
    createdByName: 'Paulo Germano',
    createdAt: '2026-06-22T12:58:00.000Z',
  },
  {
    id: 'bc-002',
    name: 'Reativação clientes dormentes',
    inboxName: 'WhatsApp Vendas SP',
    connectionType: 'Z_API',
    messageContent:
      'Olá {{nome}}, sentimos sua falta! Voltou com tudo: liberamos um bônus exclusivo pra você retomar. Posso te contar como funciona?',
    throttleMs: 3000,
    status: 'SCHEDULED',
    totalRecipients: 480,
    sentCount: 0,
    failedCount: 0,
    scheduledFor: '2026-06-23T12:00:00.000Z',
    startedAt: null,
    completedAt: null,
    createdByName: 'Paulo Germano',
    createdAt: '2026-06-22T11:30:00.000Z',
  },
  {
    id: 'bc-003',
    name: 'Convite webinar — Onboarding',
    inboxName: 'WhatsApp Suporte',
    connectionType: 'META_CLOUD',
    messageContent:
      'Oi {{nome}}! Amanhã às 19h tem webinar gratuito de onboarding. Garante sua vaga? 🎯',
    throttleMs: 1500,
    status: 'COMPLETED',
    totalRecipients: 320,
    sentCount: 308,
    failedCount: 12,
    scheduledFor: null,
    startedAt: '2026-06-20T18:00:00.000Z',
    completedAt: '2026-06-20T18:14:00.000Z',
    createdByName: 'Ana Lima',
    createdAt: '2026-06-20T17:45:00.000Z',
  },
  {
    id: 'bc-004',
    name: 'Pesquisa de satisfação Q2',
    inboxName: 'WhatsApp Comercial',
    connectionType: 'EVOLUTION',
    messageContent:
      'Oi {{nome}}, tudo bem? Em 1 minuto: de 0 a 10, o quanto você recomendaria a gente? Sua resposta vale muito! 🙏',
    throttleMs: 500,
    status: 'DRAFT',
    totalRecipients: 96,
    sentCount: 0,
    failedCount: 0,
    scheduledFor: null,
    startedAt: null,
    completedAt: null,
    createdByName: 'Paulo Germano',
    createdAt: '2026-06-22T09:15:00.000Z',
  },
  {
    id: 'bc-005',
    name: 'Lançamento integração Stripe',
    inboxName: 'WhatsApp Vendas SP',
    connectionType: 'Z_API',
    messageContent:
      'Novidade quente, {{nome}}: agora dá pra cobrar dentro do Kronos. Quer ver uma demo rápida?',
    throttleMs: 1500,
    status: 'CANCELLED',
    totalRecipients: 540,
    sentCount: 120,
    failedCount: 4,
    scheduledFor: null,
    startedAt: '2026-06-19T14:00:00.000Z',
    completedAt: null,
    createdByName: 'Ana Lima',
    createdAt: '2026-06-19T13:50:00.000Z',
  },
  {
    id: 'bc-006',
    name: 'Aviso manutenção programada',
    inboxName: 'WhatsApp Suporte',
    connectionType: 'META_CLOUD',
    messageContent:
      'Oi {{nome}}, no domingo das 2h às 4h faremos uma manutenção. Pode haver instabilidade. Qualquer dúvida, é só chamar!',
    throttleMs: 1500,
    status: 'FAILED',
    totalRecipients: 210,
    sentCount: 14,
    failedCount: 196,
    scheduledFor: null,
    startedAt: '2026-06-18T10:00:00.000Z',
    completedAt: '2026-06-18T10:03:00.000Z',
    createdByName: 'Paulo Germano',
    createdAt: '2026-06-18T09:55:00.000Z',
  },
]

const RECIPIENT_NAMES = [
  'Mariana Souza',
  'Carlos Eduardo',
  'Fernanda Alves',
  'Roberto Dias',
  'Juliana Castro',
  'Pedro Henrique',
  'Camila Rocha',
  'Lucas Martins',
  'Beatriz Nunes',
  'Rafael Gomes',
  'Patrícia Mendes',
  'Thiago Barros',
]

// Resolve o status fictício de um destinatário a partir dos contadores do disparo.
function resolveRecipientStatus(
  broadcast: MockBroadcast,
  index: number,
  total: number,
): BroadcastRecipientStatus {
  if (index < Math.min(broadcast.sentCount, total)) return 'SENT'
  if (index < Math.min(broadcast.sentCount + broadcast.failedCount, total)) {
    return 'FAILED'
  }
  if (broadcast.status === 'RUNNING' && index === broadcast.sentCount) {
    return 'SENDING'
  }
  return 'PENDING'
}

function resolveAttempts(status: BroadcastRecipientStatus): number {
  if (status === 'FAILED') return 3
  if (status === 'SENT') return 1
  return 0
}

// Gera destinatários fictícios coerentes com os contadores do broadcast.
export function getMockRecipients(
  broadcast: MockBroadcast,
): MockBroadcastRecipient[] {
  const total = Math.min(broadcast.totalRecipients, RECIPIENT_NAMES.length)
  return Array.from({ length: total }, (_, index) => {
    const status = resolveRecipientStatus(broadcast, index, total)
    return {
      id: `${broadcast.id}-r${index}`,
      contactName: RECIPIENT_NAMES[index],
      phoneSnapshot: `+55 11 9${String(40000000 + index * 137).padStart(8, '0')}`,
      status,
      errorMessage: status === 'FAILED' ? 'Número não está no WhatsApp' : null,
      attempts: resolveAttempts(status),
      sentAt: status === 'SENT' ? broadcast.startedAt : null,
    }
  })
}

export function getMockBroadcastById(id: string): MockBroadcast | undefined {
  return MOCK_BROADCASTS.find((broadcast) => broadcast.id === id)
}
