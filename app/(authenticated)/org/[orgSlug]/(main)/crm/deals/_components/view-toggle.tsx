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

  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg bg-primary/10">
      <Link
        href={`${basePath}/pipeline`}
        className={cn(
          'inline-flex items-center justify-center p-2.5 transition-all',
          activeView === 'pipeline'
            ? 'bg-primary-dark text-primary-foreground dark:bg-primary/15 dark:text-primary'
            : 'text-primary',
        )}
      >
        <Kanban className="h-5 w-5" />
      </Link>
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
    </div>
  )
}
