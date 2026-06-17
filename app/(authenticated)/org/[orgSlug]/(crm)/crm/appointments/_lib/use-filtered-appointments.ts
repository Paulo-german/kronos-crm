import { useMemo } from 'react'
import { endOfDay } from 'date-fns'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { AppointmentFilters } from './appointment-filters'

/**
 * Filtragem client-side compartilhada pelas visões de lista e calendário
 * (mês/semana/dia). Aplica responsável + status + período sobre a lista
 * carregada do servidor. Memoizado para evitar recálculo desnecessário.
 */
export function useFilteredAppointments(
  appointments: AppointmentDto[],
  filters: AppointmentFilters,
  assigneeFilter: string,
): AppointmentDto[] {
  return useMemo(() => {
    let result = appointments

    if (assigneeFilter !== 'all') {
      result = result.filter(
        (appointment) => appointment.assignedTo === assigneeFilter,
      )
    }

    if (filters.status.length > 0) {
      result = result.filter((appointment) =>
        filters.status.includes(appointment.status),
      )
    }

    if (filters.dateFrom) {
      const dateFrom = filters.dateFrom
      result = result.filter(
        (appointment) => new Date(appointment.startDate) >= dateFrom,
      )
    }

    if (filters.dateTo) {
      const dateTo = endOfDay(filters.dateTo)
      result = result.filter(
        (appointment) => new Date(appointment.startDate) <= dateTo,
      )
    }

    return result
  }, [appointments, filters, assigneeFilter])
}
