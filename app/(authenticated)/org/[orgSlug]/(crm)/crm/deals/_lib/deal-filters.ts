import { DealStatus, DealPriority } from '@prisma/client'

// Interface compartilhada entre a visão pipeline (kanban) e a visão list (paginada)
export interface DealFilters {
  status: DealStatus[]
  priority: DealPriority[]
  createdAtFrom: Date | null
  createdAtTo: Date | null
  valueMin: number | null
  valueMax: number | null
}

export const DEFAULT_DEAL_FILTERS: DealFilters = {
  status: [],
  priority: [],
  createdAtFrom: null,
  createdAtTo: null,
  valueMin: null,
  valueMax: null,
}

export const STATUS_OPTIONS = [
  {
    value: 'OPEN' as DealStatus,
    label: 'Novo',
    color: 'bg-kronos-blue/10 text-kronos-blue border-kronos-blue/20',
  },
  {
    value: 'IN_PROGRESS' as DealStatus,
    label: 'Em Andamento',
    color: 'bg-kronos-purple/10 text-kronos-purple border-kronos-purple/20',
  },
  {
    value: 'WON' as DealStatus,
    label: 'Vendido',
    color: 'bg-kronos-green/10 text-kronos-green border-kronos-green/20',
  },
  {
    value: 'LOST' as DealStatus,
    label: 'Perdido',
    color: 'bg-kronos-red/10 text-kronos-red border-kronos-red/20',
  },
  {
    value: 'PAUSED' as DealStatus,
    label: 'Pausado',
    color: 'bg-kronos-yellow/10 text-kronos-yellow border-kronos-yellow/20',
  },
]

export const PRIORITY_OPTIONS = [
  { value: 'low' as DealPriority, label: 'Baixa' },
  { value: 'medium' as DealPriority, label: 'Média' },
  { value: 'high' as DealPriority, label: 'Alta' },
  { value: 'urgent' as DealPriority, label: 'Urgente' },
]
