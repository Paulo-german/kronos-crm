'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Users,
  Phone,
  MessageCircle,
  Briefcase,
  Mail,
  ChevronDown,
  Check,
  LayoutList,
} from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Button } from '@/_components/ui/button'
import { cn } from '@/_lib/utils'
import { TASK_TYPE_OPTIONS } from '../_lib/task-filters'
import type { TaskType } from '@prisma/client'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle2,
  Users,
  Phone,
  MessageCircle,
  Briefcase,
  Mail,
}

interface TaskTypeMultiSelectProps {
  value: TaskType[]
  onChange: (value: TaskType[]) => void
}

export function TaskTypeMultiSelect({
  value,
  onChange,
}: TaskTypeMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggle = (type: TaskType) => {
    const next = value.includes(type)
      ? value.filter((item) => item !== type)
      : [...value, type]
    onChange(next)
  }

  const triggerLabel =
    value.length === 0
      ? 'Todos os tipos'
      : value.length === 1
        ? (TASK_TYPE_OPTIONS.find((option) => option.value === value[0])
            ?.label ?? '1 tipo')
        : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-56 justify-between border-border-strong bg-background font-normal hover:bg-accent"
        >
          <LayoutList className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex items-center gap-1.5 truncate text-sm">
              {triggerLabel ?? (
                <>
                  Tipos
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {value.length}
                  </Badge>
                </>
              )}
            </span>
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-2" align="start">
        {TASK_TYPE_OPTIONS.map((option) => {
          const Icon = ICON_MAP[option.icon]
          const isSelected = value.includes(option.value)

          return (
            <button
              key={option.value}
              type="button"
              className="flex w-full items-center justify-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => toggle(option.value)}
            >
              <Check
                className={cn(
                  'h-4 w-4 shrink-0',
                  isSelected ? 'opacity-100' : 'absolute opacity-0',
                )}
              />
              {Icon && (
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              {option.label}
            </button>
          )
        })}

        {value.length > 0 && (
          <>
            <div className="my-1 border-t" />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              onClick={() => onChange([])}
            >
              Limpar filtro
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
