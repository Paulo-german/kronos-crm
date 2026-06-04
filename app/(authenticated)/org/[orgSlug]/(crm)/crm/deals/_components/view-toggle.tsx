'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Kanban, LayoutList } from 'lucide-react'
import { cn } from '@/_lib/utils'

interface ViewToggleProps {
  activeView: 'pipeline' | 'list'
}

export function ViewToggle({ activeView }: ViewToggleProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const orgSlug = params?.orgSlug as string
  const basePath = `/org/${orgSlug}/crm/deals`

  const pipelineId = searchParams.get('pipelineId')
  const pipelineQuery = pipelineId ? `?pipelineId=${pipelineId}` : ''

  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg bg-primary/10">
      <Link
        href={`${basePath}/pipeline${pipelineQuery}`}
        className={cn(
          'inline-flex items-center justify-center p-2.5 transition-all',
          activeView === 'pipeline'
            ? 'bg-primary text-primary-foreground'
            : 'text-primary hover:bg-primary/10',
        )}
      >
        <Kanban className="h-5 w-5" />
      </Link>
      <Link
        href={`${basePath}/list${pipelineQuery}`}
        className={cn(
          'inline-flex items-center justify-center p-2.5 transition-all',
          activeView === 'list'
            ? 'bg-primary text-primary-foreground'
            : 'text-primary hover:bg-primary/10',
        )}
      >
        <LayoutList className="h-5 w-5" />
      </Link>
    </div>
  )
}
