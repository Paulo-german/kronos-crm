'use client'

import { Checkbox } from '@/_components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Label } from '@/_components/ui/label'

const LOG_STATUSES = [
  { value: 'PROCESSED', label: 'Processado' },
  { value: 'ERROR', label: 'Erro' },
  { value: 'IGNORED', label: 'Ignorado' },
]

const PERIOD_OPTIONS = [
  { value: '1d', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'all', label: 'Tudo' },
]

interface WebhookLogsFiltersProps {
  statusFilter: string[]
  onStatusChange: (value: string[]) => void
  periodFilter: string
  onPeriodChange: (value: string) => void
}

export function WebhookLogsFilters({
  statusFilter,
  onStatusChange,
  periodFilter,
  onPeriodChange,
}: WebhookLogsFiltersProps) {
  const handleStatusToggle = (status: string, checked: boolean) => {
    if (checked) {
      onStatusChange([...statusFilter, status])
    } else {
      onStatusChange(statusFilter.filter((s) => s !== status))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-3">
        {LOG_STATUSES.map((status) => (
          <div key={status.value} className="flex items-center gap-1.5">
            <Checkbox
              id={`status-${status.value}`}
              checked={statusFilter.includes(status.value)}
              onCheckedChange={(checked) =>
                handleStatusToggle(status.value, checked === true)
              }
            />
            <Label
              htmlFor={`status-${status.value}`}
              className="cursor-pointer text-sm font-normal"
            >
              {status.label}
            </Label>
          </div>
        ))}
      </div>

      <Select value={periodFilter} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
