'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Kanban, LayoutList } from 'lucide-react'
import { cn } from '@/_lib/utils'

interface ViewToggleProps {
  activeView: 'pipeline' | 'list'
}

export function ViewToggle({ activeView }: ViewToggleProps) {
  const params = useParams()
  const orgSlug = params?.orgSlug as string

  const basePath = `/org/${orgSlug}/crm/deals`

  const views = [
    {
      key: 'pipeline' as const,
      label: 'Pipeline',
      icon: Kanban,
      href: `${basePath}/pipeline`,
    },
    {
      key: 'list' as const,
      label: 'Lista',
      icon: LayoutList,
      href: `${basePath}/list`,
    },
  ]

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      {views.map((view) => {
        const isActive = activeView === view.key
        const Icon = view.icon
        return (
          <Link
            key={view.key}
            href={view.href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {view.label}
          </Link>
        )
      })}
    </div>
  )
}
