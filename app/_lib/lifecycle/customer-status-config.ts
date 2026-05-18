import { CustomerStatus } from '@prisma/client'

export interface CustomerStatusVisualConfig {
  label: string
  colorClassName: string
  badgeClassName: string
}

export const CUSTOMER_STATUS_CONFIG: Record<CustomerStatus, CustomerStatusVisualConfig> = {
  [CustomerStatus.NEVER_BOUGHT]: {
    label: 'Nunca comprou',
    colorClassName: 'text-muted-foreground',
    badgeClassName: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  },
  [CustomerStatus.ACTIVE]: {
    label: 'Ativo',
    colorClassName: 'text-emerald-500',
    badgeClassName: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  [CustomerStatus.DORMANT]: {
    label: 'Dormente',
    colorClassName: 'text-amber-500',
    badgeClassName: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  [CustomerStatus.CHURNED]: {
    label: 'Perdido',
    colorClassName: 'text-destructive',
    badgeClassName: 'bg-destructive/10 text-destructive border-destructive/20',
  },
}
