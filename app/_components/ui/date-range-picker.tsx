'use client'

import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/_components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Calendar } from '@/_components/ui/calendar'
import { cn } from '@/_lib/utils'
import type { DateRange } from 'react-day-picker'

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
  numberOfMonths?: 1 | 2
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Selecione um período',
  className,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const label = (() => {
    if (!value?.from) return placeholder
    const fromLabel = format(value.from, 'dd/MM/yy', { locale: ptBR })
    if (!value.to || value.from.getTime() === value.to.getTime()) {
      return fromLabel
    }
    return `${fromLabel} - ${format(value.to, 'dd/MM/yy', { locale: ptBR })}`
  })()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value?.from && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1 truncate">{label}</span>
          {value?.from && (
            <X
              className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation()
                onChange(undefined)
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={numberOfMonths}
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  )
}
