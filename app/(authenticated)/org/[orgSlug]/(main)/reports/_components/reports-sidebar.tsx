'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/_lib/utils'
import { isElevated } from '@/_lib/rbac/permissions'
import { REPORT_SECTIONS } from '../_config/report-sections'
import type { MemberRole } from '@prisma/client'

interface ReportsSidebarProps {
  userRole: MemberRole
  orgSlug: string
}

export function ReportsSidebar({ userRole, orgSlug }: ReportsSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const elevated = isElevated(userRole)

  // Preserva os filtros globais (start/end/assignee) ao trocar de seção.
  const queryString = searchParams.toString()

  return (
    <nav className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border/50 bg-sidebar p-3 md:flex">
      {REPORT_SECTIONS.map((section) => {
        if (section.requiresElevated && !elevated) return null
        const href = `/org/${orgSlug}/reports/${section.slug}`
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        const linkHref = queryString ? `${href}?${queryString}` : href
        return (
          <Link
            key={section.slug}
            href={linkHref}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
            )}
          >
            <section.icon className="h-4 w-4 shrink-0" />
            <span>{section.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
