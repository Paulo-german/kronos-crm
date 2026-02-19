'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/_components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Calendar } from '@/_components/ui/calendar'
import { getDateRangePresets } from '@/_utils/date-range'
import type { DateRange } from 'react-day-picker'

export function DateRangePicker() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  const initialRange: DateRange | undefined =
    startParam && endParam
      ? { from: new Date(startParam), to: new Date(endParam) }
      : undefined

  const [date, setDate] = React.useState<DateRange | undefined>(initialRange)
  const presets = getDateRangePresets()

  // Navega quando ambas as datas estão selecionadas
  React.useEffect(() => {
    if (!date?.from || !date?.to) return
    if (date.from.getTime() === date.to.getTime()) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('start', date.from.toISOString().split('T')[0])
    params.set('end', date.to.toISOString().split('T')[0])
    router.push(`?${params.toString()}`)
  }, [date, router, searchParams])

  function handlePreset(start: Date, end: Date) {
    setDate({ from: start, to: end })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="justify-start px-2.5 font-normal"
        >
          <CalendarIcon />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, 'dd MMM', { locale: ptBR })} -{' '}
                {format(date.to, 'dd MMM', { locale: ptBR })}
              </>
            ) : (
              format(date.from, 'dd MMM', { locale: ptBR })
            )
          ) : (
            <span>Este mês</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex gap-2 border-b p-3">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              onClick={() => handlePreset(preset.start, preset.end)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={setDate}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
