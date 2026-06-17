'use client'

import { useState } from 'react'
import { AppointmentsToolbar } from './appointments-toolbar'
import { EmptyAppointments } from './empty-appointments'
import AppointmentsDataTable from './appointments-data-table'
import { useAppointmentFilters } from '../_lib/use-appointment-filters'
import { useFilteredAppointments } from '../_lib/use-filtered-appointments'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { MemberRole } from '@prisma/client'

interface AppointmentsListClientProps {
  appointments: AppointmentDto[]
  members: AcceptedMemberDto[]
  currentUserId: string
  userRole: MemberRole
  contactOptions: ContactOptionDto[]
  services: ServiceDto[]
  orgSlug: string
}

export function AppointmentsListClient({
  appointments,
  members,
  currentUserId,
  userRole,
  contactOptions,
  services,
  orgSlug,
}: AppointmentsListClientProps) {
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

  // Empty state premium: lista original vazia E sem filtros ativos
  const showEmptyState =
    appointments.length === 0 && !hasActiveFilters && assigneeFilter === 'all'

  if (showEmptyState) {
    return (
      <EmptyAppointments
        members={members}
        contactOptions={contactOptions}
        services={services}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <AppointmentsToolbar
        activeView="list"
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
      <AppointmentsDataTable
        appointments={filteredAppointments}
        members={members}
        contactOptions={contactOptions}
        services={services}
        orgSlug={orgSlug}
      />
    </div>
  )
}
