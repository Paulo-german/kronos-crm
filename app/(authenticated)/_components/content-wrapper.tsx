'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/_lib/utils'

interface ContentWrapperProps {
  children: React.ReactNode
}

export const ContentWrapper = ({ children }: ContentWrapperProps) => {
  const pathname = usePathname()

  // Check if we are on the deal detail page: /org/[slug]/crm/deals/[id]
  const isDealDetailPage =
    /\/crm\/deals\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      pathname,
    )

  // Inbox precisa de layout full-height sem padding
  const isInboxPage = /\/inbox(\/|$)/.test(pathname)

  const isFullBleed = isDealDetailPage || isInboxPage

  return (
    <main
      className={cn(
        'min-h-0 flex-1 overflow-y-auto',
        !isFullBleed && 'p-4 md:p-8',
      )}
    >
      {children}
    </main>
  )
}
