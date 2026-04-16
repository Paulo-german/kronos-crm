'use client'

import { CalendarIcon } from 'lucide-react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { parseAsString, useQueryStates } from 'nuqs'
import { Button } from '@/_components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Calendar } from '@/_components/ui/calendar'
import { getDateRangePresets } from '@/_utils/date-range'
import type { DateRange } from 'react-day-picker'

const URL_DATE_FORMAT = 'yyyy-MM-dd'

// Parsers nuqs: shallow:false força revalidação server-side (mesma convenção
// usada por DashboardFiltersBar e InboxDashboardFiltersBar).
const dateRangeParsers = {
  start: parseAsString.withOptions({ shallow: false }),
  end: parseAsString.withOptions({ shallow: false }),
}

export function DateRangePicker() {
  const [range, setRange] = useQueryStates(dateRangeParsers)
  const presets = getDateRangePresets()

  // URL é a única fonte de verdade — deriva o DateRange do react-day-picker
  // diretamente dos query params, sem useState local. Usamos `parse` (date-fns)
  // em vez de `new Date(string)` para evitar o shift de timezone do parser
  // nativo, que interpreta "yyyy-MM-dd" como UTC midnight.
  const selected: DateRange | undefined = range.start
    ? {
        from: parse(range.start, URL_DATE_FORMAT, new Date()),
        to: range.end
          ? parse(range.end, URL_DATE_FORMAT, new Date())
          : parse(range.start, URL_DATE_FORMAT, new Date()),
      }
    : undefined

  function applyRange(from: Date, to: Date) {
    void setRange({
      start: format(from, URL_DATE_FORMAT),
      end: format(to, URL_DATE_FORMAT),
    })
  }

  function handleSelect(next: DateRange | undefined) {
    if (!next?.from) {
      void setRange({ start: null, end: null })
      return
    }

    // react-day-picker (mode=range) devolve `to` indefinido enquanto o
    // usuário ainda não fechou o range (primeiro clique). Só commitamos
    // quando `to` existe — evita que o primeiro clique trave o estado e
    // cause o segundo clique a ser interpretado como novo `from`.
    if (!next.to) return

    applyRange(next.from, next.to)
  }

  const buttonLabel = (() => {
    if (!selected?.from) return 'Este mês'
    const fromLabel = format(selected.from, 'dd MMM', { locale: ptBR })
    if (!selected.to || selected.from.getTime() === selected.to.getTime()) {
      return fromLabel
    }
    const toLabel = format(selected.to, 'dd MMM', { locale: ptBR })
    return `${fromLabel} - ${toLabel}`
  })()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="justify-start px-2.5 font-normal"
        >
          <CalendarIcon />
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-wrap gap-2 border-b p-3">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              onClick={() => applyRange(preset.start, preset.end)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          defaultMonth={selected?.from}
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
