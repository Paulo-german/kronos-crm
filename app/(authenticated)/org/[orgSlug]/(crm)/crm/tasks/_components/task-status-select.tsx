'use client'

import { useState } from 'react'
import { ChevronDown, Check, CircleDot } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Button } from '@/_components/ui/button'
import { cn } from '@/_lib/utils'
import { TASK_STATUS_OPTIONS } from '../_lib/task-filters'
import type { TaskFilters } from '../_lib/task-filters'

interface TaskStatusSelectProps {
  value: TaskFilters['status']
  onChange: (value: TaskFilters['status']) => void
}

export function TaskStatusSelect({ value, onChange }: TaskStatusSelectProps) {
  const [open, setOpen] = useState(false)

  const currentLabel =
    TASK_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? 'Todas'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-56 justify-between border-border-strong bg-background font-normal hover:bg-accent"
        >
          <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm">{currentLabel}</span>
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[185px] p-2" align="start">
        {TASK_STATUS_OPTIONS.map((option) => {
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              className="flex w-full items-center justify-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              <Check
                className={cn(
                  'h-4 w-4 shrink-0',
                  isSelected ? 'opacity-100' : 'absolute opacity-0',
                )}
              />
              {option.label}
            </button>
          )
        })}

        {value !== 'all' && (
          <>
            <div className="my-1 border-t" />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              onClick={() => {
                onChange('all')
                setOpen(false)
              }}
            >
              Limpar filtro
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
