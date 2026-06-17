import { Flag, type LucideIcon } from 'lucide-react'

export const DEAL_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type DealPriority = (typeof DEAL_PRIORITIES)[number]

export const DEAL_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WON',
  'LOST',
  'PAUSED',
] as const
export type DealStatus = (typeof DEAL_STATUSES)[number]

interface PriorityDisplay {
  label: string
  icon: LucideIcon
  /** Estilo "outline" — usado nos cards do Kanban e nos filtros. */
  color: string
  /** Estilo "filled" — usado na tela de detalhe. */
  badgeClassName: string
}

/**
 * Fonte única de label/cor/ícone de prioridade de deal. Cada site escolhe a
 * variante visual (`color` outline x `badgeClassName` filled).
 */
export const PRIORITY_CONFIG: Record<DealPriority, PriorityDisplay> = {
  low: {
    label: 'BAIXA',
    icon: Flag,
    color: 'border-muted-foreground/30 text-muted-foreground',
    badgeClassName:
      'bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20 hover:text-zinc-400',
  },
  medium: {
    label: 'MÉDIA',
    icon: Flag,
    color: 'border-kronos-blue/40 text-kronos-blue',
    badgeClassName:
      'bg-primary/20 text-primary hover:bg-primary/20 hover:text-primary',
  },
  high: {
    label: 'ALTA',
    icon: Flag,
    color: 'border-kronos-yellow/40 text-kronos-yellow',
    badgeClassName:
      'bg-amber-500/20 text-amber-500 hover:bg-amber-500/20 hover:text-amber-500',
  },
  urgent: {
    label: 'URGENTE',
    icon: Flag,
    color: 'border-kronos-red/40 text-kronos-red',
    badgeClassName:
      'bg-red-500/20 text-red-500 hover:bg-red-500/20 hover:text-red-500',
  },
}

interface StatusDisplay {
  label: string
  variant: 'secondary'
  /** Estilo "filled" — usado na tela de detalhe. */
  badgeClassName: string
  /** Texto transparente — usado nos cards do Kanban. */
  textClassName: string
}

/**
 * Fonte única de label/cor de status de deal.
 */
export const STATUS_CONFIG: Record<DealStatus, StatusDisplay> = {
  OPEN: {
    label: 'NOVO',
    variant: 'secondary',
    badgeClassName:
      'bg-kronos-blue/10 text-kronos-blue border-kronos-blue/20 hover:bg-kronos-blue/20',
    textClassName: 'text-kronos-blue border-none bg-transparent',
  },
  IN_PROGRESS: {
    label: 'EM ANDAMENTO',
    variant: 'secondary',
    badgeClassName:
      'bg-kronos-purple/10 text-kronos-purple border-kronos-purple/20 hover:bg-kronos-purple/20',
    textClassName: 'text-kronos-purple border-none bg-transparent',
  },
  WON: {
    label: 'VENDIDO',
    variant: 'secondary',
    badgeClassName:
      'bg-kronos-green/10 text-kronos-green border-kronos-green/20 hover:bg-kronos-green/20',
    textClassName: 'text-kronos-green border-none bg-transparent',
  },
  LOST: {
    label: 'PERDIDO',
    variant: 'secondary',
    badgeClassName:
      'bg-kronos-red/10 text-kronos-red border-kronos-red/20 hover:bg-kronos-red/20',
    textClassName: 'text-kronos-red border-none bg-transparent',
  },
  PAUSED: {
    label: 'PAUSADO',
    variant: 'secondary',
    badgeClassName:
      'bg-kronos-yellow/10 text-kronos-yellow border-kronos-yellow/20 hover:bg-kronos-yellow/20',
    textClassName: 'text-kronos-yellow border-none bg-transparent',
  },
}
