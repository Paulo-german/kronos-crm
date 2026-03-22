'use client'

import { Search, UserIcon } from 'lucide-react'
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { TaskFiltersSheet } from './task-filters-sheet'
import { TaskFilterBadges } from './task-filter-badges'
import CreateTaskButton from './create-task-button'
import type { TaskFilters } from '../_lib/task-filters'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { MemberRole } from '@prisma/client'
import type { MemberOption } from './tasks-list-client'

interface TasksToolbarProps {
  dealOptions: DealOptionDto[]
  members: MemberOption[]
  currentUserId: string
  userRole: MemberRole
  filters: TaskFilters
  onFiltersChange: (filters: Partial<TaskFilters>) => void
  onClearFilters: () => void
  activeFilterCount: number
  hasActiveFilters: boolean
  assigneeFilter: string
  onAssigneeFilterChange: (value: string) => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
}

export function TasksToolbar({
  dealOptions,
  members,
  userRole,
  filters,
  onFiltersChange,
  onClearFilters,
  activeFilterCount,
  hasActiveFilters,
  assigneeFilter,
  onAssigneeFilterChange,
  searchQuery,
  onSearchQueryChange,
}: TasksToolbarProps) {
  const isMember = userRole === 'MEMBER'

  return (
    <div className="flex flex-col gap-3">
      {/* Linha 1: Search input full-width */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por título ou negócio..."
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="pl-9"
        />
      </div>

      {/* Linha 2: Select responsável + filtros + botão criar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Select
            value={assigneeFilter}
            onValueChange={onAssigneeFilterChange}
            disabled={isMember}
          >
            <SelectTrigger className="w-[260px]">
              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              {!isMember && (
                <SelectItem value="all">Todos os responsáveis</SelectItem>
              )}
              {members.map((member) => (
                <SelectItem
                  key={member.userId}
                  value={member.userId}
                >
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TaskFiltersSheet
            filters={filters}
            onFiltersChange={onFiltersChange}
            activeFilterCount={activeFilterCount}
          />

          <div className="flex-1" />

          <CreateTaskButton dealOptions={dealOptions} />
        </div>

        <TaskFilterBadges
          filters={filters}
          onFiltersChange={onFiltersChange}
          onClearFilters={onClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
    </div>
  )
}
