'use client'

import { useState, useMemo } from 'react'
import { AppointmentsToolbar } from './appointments-toolbar'
import { CalendarView } from './calendar-view'
import { useAppointmentFilters } from '../_lib/use-appointment-filters'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { MemberRole } from '@prisma/client'

interface AppointmentsCalendarClientProps {
  appointments: AppointmentDto[]
  dealOptions: DealOptionDto[]
  members: AcceptedMemberDto[]
  currentUserId: string
  userRole: MemberRole
}

export function AppointmentsCalendarClient({
  appointments,
  dealOptions,
  members,
  currentUserId,
  userRole,
}: AppointmentsCalendarClientProps) {
  const { filters, setFilters, clearFilters, activeFilterCount, hasActiveFilters } =
    useAppointmentFilters()

  // MEMBER fica fixado no próprio userId; demais usuários podem escolher
  const isMember = userRole === 'MEMBER'
  const [assigneeFilter, setAssigneeFilter] = useState(
    isMember ? currentUserId : 'all',
  )

  // Filtragem client-side via useMemo (mesmo padrão do list client)
  const filteredAppointments = useMemo(() => {
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
      const dateTo = filters.dateTo
      result = result.filter(
        (appointment) => new Date(appointment.startDate) <= dateTo,
      )
    }

    return result
  }, [appointments, filters, assigneeFilter])

  return (
    <div className="flex flex-col gap-4">
      <AppointmentsToolbar
        activeView="calendar"
        dealOptions={dealOptions}
        members={members}
        currentUserId={currentUserId}
        userRole={userRole}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        activeFilterCount={activeFilterCount}
        hasActiveFilters={hasActiveFilters}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
      />
      <CalendarView
        appointments={filteredAppointments}
        dealOptions={dealOptions}
        members={members}
      />
    </div>
  )
}
