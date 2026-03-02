import { differenceInMinutes } from 'date-fns'
import type { AppointmentStatus } from '@prisma/client'

export const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string }
> = {
  SCHEDULED: {
    label: 'AGENDADO',
    color: 'text-kronos-blue',
  },
  IN_PROGRESS: {
    label: 'EM ANDAMENTO',
    color: 'text-kronos-purple',
  },
  COMPLETED: {
    label: 'CONCLUÍDO',
    color: 'text-kronos-green',
  },
  CANCELED: {
    label: 'CANCELADO',
    color: 'text-kronos-red',
  },
  NO_SHOW: {
    label: 'NÃO COMPARECEU',
    color: 'text-kronos-yellow',
  },
}

export const formatDuration = (startDate: Date, endDate: Date): string => {
  const minutes = differenceInMinutes(new Date(endDate), new Date(startDate))
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}min`
}
