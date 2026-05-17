export const DEAL_STATUS_CONFIG = {
  OPEN: { label: 'Aberto', color: 'hsl(var(--primary))' },
  IN_PROGRESS: { label: 'Em andamento', color: 'hsl(var(--kronos-blue))' },
  WON: { label: 'Ganho', color: 'var(--kronos-green)' },
  LOST: { label: 'Perdido', color: 'hsl(var(--kronos-red))' },
} as const

export type DealStatusKey = keyof typeof DEAL_STATUS_CONFIG

export const DEAL_STATUS_ORDER: DealStatusKey[] = [
  'OPEN',
  'IN_PROGRESS',
  'WON',
  'LOST',
]
