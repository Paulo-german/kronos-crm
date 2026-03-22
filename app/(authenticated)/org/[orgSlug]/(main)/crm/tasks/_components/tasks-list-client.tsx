'use client'

import { useState, useMemo } from 'react'
import { TasksToolbar } from './tasks-toolbar'
import { EmptyTasks } from './empty-tasks'
import TasksDataTable from './tasks-data-table'
import { useTaskFilters } from '../_lib/use-task-filters'
import type { TaskDto } from '@/_data-access/task/get-tasks'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { MemberRole, TaskType } from '@prisma/client'

// Tipo simplificado para o select de responsável (normalizado na page.tsx)
export interface MemberOption {
  userId: string
  name: string
}

interface TasksListClientProps {
  tasks: TaskDto[]
  dealOptions: DealOptionDto[]
  members: MemberOption[]
  currentUserId: string
  userRole: MemberRole
}

export function TasksListClient({
  tasks,
  dealOptions,
  members,
  currentUserId,
  userRole,
}: TasksListClientProps) {
  const { filters, setFilters, clearFilters, activeFilterCount, hasActiveFilters } =
    useTaskFilters()

  // Estado de busca local (não vai pra URL — é transiente e alto-frequência)
  const [searchQuery, setSearchQuery] = useState('')

  // MEMBER fica fixado no próprio userId; demais podem escolher qualquer responsável
  const isMember = userRole === 'MEMBER'
  const [assigneeFilter, setAssigneeFilter] = useState(
    isMember ? currentUserId : 'all',
  )

  // Filtragem combinada client-side via useMemo para evitar recálculo desnecessário
  const filteredTasks = useMemo(() => {
    let result = tasks

    // Filtro de responsável
    if (assigneeFilter !== 'all') {
      result = result.filter((task) => task.assignedTo === assigneeFilter)
    }

    // Filtro de busca (título + nome do deal)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.deal.title.toLowerCase().includes(query),
      )
    }

    // Filtro de tipos
    if (filters.types.length > 0) {
      result = result.filter((task) =>
        filters.types.includes(task.type as TaskType),
      )
    }

    // Filtro de status
    if (filters.status === 'pending') {
      result = result.filter((task) => !task.isCompleted)
    } else if (filters.status === 'completed') {
      result = result.filter((task) => task.isCompleted)
    }

    // Filtro de período (dateFrom)
    if (filters.dateFrom) {
      const dateFrom = filters.dateFrom
      result = result.filter((task) => new Date(task.dueDate) >= dateFrom)
    }

    // Filtro de período (dateTo)
    if (filters.dateTo) {
      const dateTo = filters.dateTo
      result = result.filter((task) => new Date(task.dueDate) <= dateTo)
    }

    return result
  }, [tasks, filters, assigneeFilter, searchQuery])

  // Empty state premium: lista original vazia E sem filtros/search ativos
  const showEmptyState =
    tasks.length === 0 &&
    !hasActiveFilters &&
    assigneeFilter === 'all' &&
    !searchQuery

  if (showEmptyState) {
    return <EmptyTasks dealOptions={dealOptions} />
  }

  return (
    <div className="flex flex-col gap-4">
      <TasksToolbar
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
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />
      <TasksDataTable tasks={filteredTasks} dealOptions={dealOptions} />
    </div>
  )
}
