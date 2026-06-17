'use client'

import { UserIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { AppointmentViewToggle } from './appointment-view-toggle'
import { CalendarGranularityToggle } from './calendar-granularity-toggle'
import { AppointmentFiltersSheet } from './appointment-filters-sheet'
import { AppointmentFilterBadges } from './appointment-filter-badges'
import CreateAppointmentButton from './create-appointment-button'
import type { AppointmentFilters } from '../_lib/appointment-filters'
import type { CalendarGranularity } from './calendar/use-calendar-date'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { MemberRole } from '@prisma/client'

interface AppointmentsToolbarProps {
  activeView: 'list' | 'calendar'
  /** Granularidade ativa quando activeView === 'calendar' (mês/semana/dia) */
  calendarGranularity?: CalendarGranularity
  members: AcceptedMemberDto[]
  currentUserId: string
  userRole: MemberRole
  filters: AppointmentFilters
  onFiltersChange: (filters: Partial<AppointmentFilters>) => void
  onClearFilters: () => void
  activeFilterCount: number
  hasActiveFilters: boolean
  assigneeFilter: string
  onAssigneeFilterChange: (value: string) => void
  contactOptions: ContactOptionDto[]
  services: ServiceDto[]
}

export function AppointmentsToolbar({
  activeView,
  calendarGranularity,
  members,
  currentUserId,
  userRole,
  filters,
  onFiltersChange,
  onClearFilters,
  activeFilterCount,
  hasActiveFilters,
  assigneeFilter,
  onAssigneeFilterChange,
  contactOptions,
  services,
}: AppointmentsToolbarProps) {
  const isMember = userRole === 'MEMBER'

  return (
    <div className="flex flex-col gap-4">
      {/* Linha 1: Toggle de visão + granularidade (calendário) + Botão de criação */}
      <div className="flex flex-wrap items-center gap-2">
        <AppointmentViewToggle activeView={activeView} />
        {activeView === 'calendar' && calendarGranularity && (
          <CalendarGranularityToggle active={calendarGranularity} />
        )}
        <div className="sm:ml-auto">
          <CreateAppointmentButton
            members={members}
            contactOptions={contactOptions}
            services={services}
          />
        </div>
      </div>

      {/* Linha 2: Select de responsável + Sheet de filtros + Badges */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={assigneeFilter}
            onValueChange={onAssigneeFilterChange}
            disabled={isMember}
          >
            <SelectTrigger className="w-full bg-background sm:w-[300px]">
              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              {!isMember && (
                <SelectItem value="all">Todos os responsáveis</SelectItem>
              )}
              {members.map((member) => (
                <SelectItem
                  key={member.userId ?? member.id}
                  value={member.userId ?? currentUserId}
                >
                  {member.user?.fullName || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AppointmentFiltersSheet
            filters={filters}
            onFiltersChange={onFiltersChange}
            activeFilterCount={activeFilterCount}
          />
        </div>

        <AppointmentFilterBadges
          filters={filters}
          onFiltersChange={onFiltersChange}
          onClearFilters={onClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
    </div>
  )
}
