export interface InboxFilters {
  connectionStatus: ('connected' | 'disconnected')[]
  provider: string[]
  channel: string[]
}

export const CONNECTION_STATUS_OPTIONS = [
  { value: 'connected', label: 'Conectado' },
  { value: 'disconnected', label: 'Desconectado' },
] as const

export const PROVIDER_OPTIONS = [
  { value: 'EVOLUTION_GO', label: 'Evolution Go' },
  { value: 'EVOLUTION_JS', label: 'Evolution JS' },
  { value: 'EVOLUTION', label: 'Evolution API' },
  { value: 'META_CLOUD', label: 'Meta Cloud' },
  { value: 'Z_API', label: 'Z-API' },
] as const

export const CHANNEL_OPTIONS = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'WEB_CHAT', label: 'Web Chat' },
  { value: 'INSTAGRAM_DM', label: 'Instagram DM' },
] as const
