'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/_lib/utils'

interface ContentWrapperProps {
  children: React.ReactNode
}

export const ContentWrapper = ({ children }: ContentWrapperProps) => {
  const pathname = usePathname()

  // Check if we are on the deal detail page: /org/[slug]/crm/pipeline/deal/[id]
  const isDealDetailPage = /\/crm\/pipeline\/deal\/[^/]+$/.test(pathname)

  return (
    <main
      className={cn(
        'min-h-0 flex-1 overflow-y-auto pt-4',
        !isDealDetailPage && 'p-4 md:p-8',
      )}
    >
      {children}
    </main>
  )
}
