import type { AppointmentStatus } from '@prisma/client'

export interface AppointmentFilters {
  status: AppointmentStatus[]
  dateFrom: Date | null
  dateTo: Date | null
}

export const DEFAULT_APPOINTMENT_FILTERS: AppointmentFilters = {
  status: [],
  dateFrom: null,
  dateTo: null,
}

export const APPOINTMENT_STATUS_OPTIONS: Array<{
  value: AppointmentStatus
  label: string
  color: string
}> = [
  {
    value: 'SCHEDULED',
    label: 'Agendado',
    color: 'bg-kronos-blue/10 text-kronos-blue border-kronos-blue/20',
  },
  {
    value: 'IN_PROGRESS',
    label: 'Em Andamento',
    color: 'bg-kronos-purple/10 text-kronos-purple border-kronos-purple/20',
  },
  {
    value: 'COMPLETED',
    label: 'Concluído',
    color: 'bg-kronos-green/10 text-kronos-green border-kronos-green/20',
  },
  {
    value: 'CANCELED',
    label: 'Cancelado',
    color: 'bg-kronos-red/10 text-kronos-red border-kronos-red/20',
  },
  {
    value: 'NO_SHOW',
    label: 'Não Compareceu',
    color: 'bg-kronos-yellow/10 text-kronos-yellow border-kronos-yellow/20',
  },
]

// Mapa de cores para os blocos do calendário (inclui border-left colorida)
export const STATUS_CALENDAR_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-kronos-blue/10 text-kronos-blue border-l-2 border-l-kronos-blue',
  IN_PROGRESS: 'bg-kronos-purple/10 text-kronos-purple border-l-2 border-l-kronos-purple',
  COMPLETED: 'bg-kronos-green/10 text-kronos-green border-l-2 border-l-kronos-green',
  CANCELED: 'bg-kronos-red/10 text-kronos-red border-l-2 border-l-kronos-red line-through opacity-60',
  NO_SHOW: 'bg-kronos-yellow/10 text-kronos-yellow border-l-2 border-l-kronos-yellow opacity-60',
}
