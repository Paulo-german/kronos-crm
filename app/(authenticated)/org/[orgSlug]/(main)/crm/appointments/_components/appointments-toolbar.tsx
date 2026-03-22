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
import { AppointmentFiltersSheet } from './appointment-filters-sheet'
import { AppointmentFilterBadges } from './appointment-filter-badges'
import CreateAppointmentButton from './create-appointment-button'
import type { AppointmentFilters } from '../_lib/appointment-filters'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { MemberRole } from '@prisma/client'

interface AppointmentsToolbarProps {
  activeView: 'list' | 'calendar'
  dealOptions: DealOptionDto[]
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
}

export function AppointmentsToolbar({
  activeView,
  dealOptions,
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
}: AppointmentsToolbarProps) {
  const isMember = userRole === 'MEMBER'

  return (
    <div className="flex flex-col gap-4">
      {/* Linha 1: Toggle de visão + Botão de criação */}
      <div className="flex items-center gap-2">
        <AppointmentViewToggle activeView={activeView} />
        <div className="flex-1" />
        <CreateAppointmentButton dealOptions={dealOptions} members={members} />
      </div>

      {/* Linha 2: Select de responsável + Sheet de filtros + Badges */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Select
            value={assigneeFilter}
            onValueChange={onAssigneeFilterChange}
            disabled={isMember}
          >
            <SelectTrigger className="w-[300px]">
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
