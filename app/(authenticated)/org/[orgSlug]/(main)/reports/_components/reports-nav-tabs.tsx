'use client'

import Link from 'next/link'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/_lib/utils'
import { REPORT_SECTIONS } from '../_config/report-sections'

interface ReportsNavTabsProps {
  isElevated: boolean
}

export function ReportsNavTabs({ isElevated }: ReportsNavTabsProps) {
  const pathname = usePathname()
  const params = useParams()
  const searchParams = useSearchParams()
  const orgSlug = params?.orgSlug as string

  // Preserva os filtros globais (start/end/assignee) ao trocar de aba.
  const queryString = searchParams.toString()

  const visibleSections = REPORT_SECTIONS.filter(
    (section) => !section.requiresElevated || isElevated,
  )

  return (
    <div className="overflow-x-auto border-b border-border/50">
      <nav className="flex min-w-max">
        {visibleSections.map((section) => {
          const href = `/org/${orgSlug}/reports/${section.slug}`
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          const linkHref = queryString ? `${href}?${queryString}` : href
          const Icon = section.icon

          return (
            <Link
              key={section.slug}
              href={linkHref}
              className={cn(
                'flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-4 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {section.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
