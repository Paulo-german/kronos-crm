import type {
  BroadcastStatus,
  BroadcastRecipientStatus,
  ConnectionType,
} from '@prisma/client'

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

// Só os provedores que suportam disparo; fallback para o próprio valor do enum
const CONNECTION_LABELS_MAP: Partial<Record<ConnectionType, string>> = {
  EVOLUTION: 'Evolution API',
  META_CLOUD: 'Meta Cloud',
  Z_API: 'Z-API',
}

export const getConnectionLabel = (connectionType: ConnectionType): string =>
  CONNECTION_LABELS_MAP[connectionType] ?? connectionType
