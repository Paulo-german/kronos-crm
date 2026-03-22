'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { LayoutList, CalendarDays } from 'lucide-react'
import { cn } from '@/_lib/utils'

interface AppointmentViewToggleProps {
  activeView: 'list' | 'calendar'
}

export function AppointmentViewToggle({
  activeView,
}: AppointmentViewToggleProps) {
  const params = useParams()
  const orgSlug = params?.orgSlug as string
  const basePath = `/org/${orgSlug}/crm/appointments`

  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg bg-primary/10">
      <Link
        href={`${basePath}/list`}
        className={cn(
          'inline-flex items-center justify-center p-2.5 transition-all',
          activeView === 'list'
            ? 'bg-primary-dark text-primary-foreground dark:bg-primary/15 dark:text-primary'
            : 'text-primary',
        )}
      >
        <LayoutList className="h-5 w-5" />
      </Link>
      <Link
        href={`${basePath}/calendar`}
        className={cn(
          'inline-flex items-center justify-center p-2.5 transition-all',
          activeView === 'calendar'
            ? 'bg-primary-dark text-primary-foreground dark:bg-primary/15 dark:text-primary'
            : 'text-primary',
        )}
      >
        <CalendarDays className="h-5 w-5" />
      </Link>
    </div>
  )
}
