'use client'

import { Search, UserIcon, ChevronDown, Check } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { cn } from '@/_lib/utils'
import { TaskFiltersSheet } from './task-filters-sheet'
import { TaskFilterBadges } from './task-filter-badges'
import { TaskTypeMultiSelect } from './task-type-multi-select'
import { TaskStatusSelect } from './task-status-select'
import CreateTaskButton from './create-task-button'
import type { TaskFilters } from '../_lib/task-filters'
import type { TaskType } from '@prisma/client'
import type { MemberRole } from '@prisma/client'
import type { MemberOption } from './tasks-list-client'

interface TasksToolbarProps {
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
  searchQuery,
  onSearchQueryChange,
}: TasksToolbarProps) {
  const isMember = userRole === 'MEMBER'
  const [assigneeOpen, setAssigneeOpen] = useState(false)

  const effectiveAssignee = isMember ? currentUserId : assigneeFilter
  const assigneeName = members.find(
    (member) => member.userId === effectiveAssignee,
  )?.name

  const assigneeTriggerLabel =
    effectiveAssignee === 'all' || !assigneeName
      ? 'Todos os responsáveis'
      : assigneeName

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

      {/* Linha 2: Responsável + Tipo + Status + Filtros + Criar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Responsável */}
          <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
            <PopoverTrigger asChild disabled={isMember}>
              <Button
                variant="outline"
                className="w-64 justify-between border-border-strong bg-background font-normal hover:bg-accent"
              >
                <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm">
                    {assigneeTriggerLabel}
                  </span>
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2" align="start">
              {!isMember && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    onAssigneeFilterChange('all')
                    setAssigneeOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      assigneeFilter === 'all' ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  Todos os responsáveis
                </button>
              )}
              {members.map((member) => {
                const isSelected = assigneeFilter === member.userId
                return (
                  <button
                    key={member.userId}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      onAssigneeFilterChange(member.userId)
                      setAssigneeOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {member.name}
                  </button>
                )
              })}
              {assigneeFilter !== 'all' && !isMember && (
                <>
                  <div className="my-1 border-t" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                    onClick={() => {
                      onAssigneeFilterChange('all')
                      setAssigneeOpen(false)
                    }}
                  >
                    Limpar filtro
                  </button>
                </>
              )}
            </PopoverContent>
          </Popover>

          {/* Tipo */}
          <TaskTypeMultiSelect
            value={filters.types}
            onChange={(types) =>
              onFiltersChange({ types: types as TaskType[] })
            }
          />

          {/* Status */}
          <TaskStatusSelect
            value={filters.status}
            onChange={(status) => onFiltersChange({ status })}
          />

          <TaskFiltersSheet
            filters={filters}
            onFiltersChange={onFiltersChange}
            activeFilterCount={activeFilterCount}
          />

          <div className="flex-1" />

          <CreateTaskButton />
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
