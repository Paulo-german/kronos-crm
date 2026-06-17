import type { TaskType } from '@prisma/client'

export interface TaskFilters {
  types: TaskType[]
  status: 'all' | 'pending' | 'overdue' | 'completed'
  dateFrom: Date | null
  dateTo: Date | null
  createdAtFrom: Date | null
  createdAtTo: Date | null
}

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  types: [],
  status: 'all',
  dateFrom: null,
  dateTo: null,
  createdAtFrom: null,
  createdAtTo: null,
}

export const TASK_STATUS_OPTIONS: Array<{
  value: TaskFilters['status']
  label: string
}> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'completed', label: 'Concluídas' },
]
