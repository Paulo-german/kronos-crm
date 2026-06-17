'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { cn } from '@/_lib/utils'
import type { CalendarGranularity } from './calendar/use-calendar-date'

interface CalendarGranularityToggleProps {
  active: CalendarGranularity
}

const OPTIONS: Array<{
  value: CalendarGranularity
  label: string
  path: string
}> = [
  { value: 'month', label: 'Mês', path: '/calendar' },
  { value: 'week', label: 'Semana', path: '/calendar/week' },
  { value: 'day', label: 'Dia', path: '/calendar/day' },
]

export function CalendarGranularityToggle({
  active,
}: CalendarGranularityToggleProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const orgSlug = params?.orgSlug as string
  const basePath = `/org/${orgSlug}/crm/appointments`

  // Preserva os query params atuais (?date, filtros) ao trocar de granularidade
  const query = searchParams.toString()
  const suffix = query ? `?${query}` : ''

  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg bg-primary/10">
      {OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={`${basePath}${option.path}${suffix}`}
          className={cn(
            'inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-all',
            active === option.value
              ? 'bg-primary text-primary-foreground'
              : 'text-primary hover:bg-primary/10',
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}
