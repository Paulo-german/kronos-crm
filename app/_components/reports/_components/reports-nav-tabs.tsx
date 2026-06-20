'use client'

import Link from 'next/link'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/_lib/utils'
import { REPORT_SECTIONS, type ReportSection } from '../_config/report-sections'
import { getReportSectionIcon } from '../_config/report-section-icons'

interface ReportsNavTabsProps {
  isElevated: boolean
  basePath?: string
  sections?: readonly ReportSection[]
}

export function ReportsNavTabs({
  isElevated,
  basePath = 'reports',
  sections = REPORT_SECTIONS,
}: ReportsNavTabsProps) {
  const pathname = usePathname()
  const params = useParams()
  const searchParams = useSearchParams()
  const orgSlug = params?.orgSlug as string

  const queryString = searchParams.toString()

  const visibleSections = sections.filter(
    (section) => !section.requiresElevated || isElevated,
  )

  return (
    <div className="overflow-x-auto border-b border-border/50">
      <nav className="flex min-w-max">
        {visibleSections.map((section) => {
          const href = `/org/${orgSlug}/${basePath}/${section.slug}`
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          const linkHref = queryString ? `${href}?${queryString}` : href
          const Icon = getReportSectionIcon(section.iconName)

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
