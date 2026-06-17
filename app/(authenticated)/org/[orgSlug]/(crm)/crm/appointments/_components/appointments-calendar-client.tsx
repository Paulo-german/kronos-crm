'use client'

import { useState } from 'react'
import { AppointmentsToolbar } from './appointments-toolbar'
import { CalendarView } from './calendar-view'
import { WeekView } from './calendar/week-view'
import { DayView } from './calendar/day-view'
import { useAppointmentFilters } from '../_lib/use-appointment-filters'
import { useFilteredAppointments } from '../_lib/use-filtered-appointments'
import type { CalendarGranularity } from './calendar/use-calendar-date'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { MemberRole } from '@prisma/client'

interface AppointmentsCalendarClientProps {
  appointments: AppointmentDto[]
  members: AcceptedMemberDto[]
  currentUserId: string
  userRole: MemberRole
  contactOptions: ContactOptionDto[]
  services: ServiceDto[]
  /** Sub-visão do calendário (mês/semana/dia) — define a rota e a grade */
  granularity: CalendarGranularity
}

export function AppointmentsCalendarClient({
  appointments,
  members,
  currentUserId,
  userRole,
  contactOptions,
  services,
  granularity,
}: AppointmentsCalendarClientProps) {
  const {
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
  } = useAppointmentFilters()

  // MEMBER fica fixado no próprio userId; demais usuários podem escolher
  const isMember = userRole === 'MEMBER'
  const [assigneeFilter, setAssigneeFilter] = useState(
    isMember ? currentUserId : 'all',
  )

  // Filtragem client-side compartilhada (responsável + status + período)
  const filteredAppointments = useFilteredAppointments(
    appointments,
    filters,
    assigneeFilter,
  )

  const viewProps = {
    appointments: filteredAppointments,
    members,
    contactOptions,
    services,
  }

  return (
    <div className="flex flex-col gap-4">
      <AppointmentsToolbar
        activeView="calendar"
        calendarGranularity={granularity}
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
        contactOptions={contactOptions}
        services={services}
      />
      {granularity === 'week' ? (
        <WeekView {...viewProps} />
      ) : granularity === 'day' ? (
        <DayView {...viewProps} />
      ) : (
        <CalendarView {...viewProps} />
      )}
    </div>
  )
}
