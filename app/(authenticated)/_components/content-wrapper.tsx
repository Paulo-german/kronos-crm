'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/_lib/utils'

interface ContentWrapperProps {
  children: React.ReactNode
}

export const ContentWrapper = ({ children }: ContentWrapperProps) => {
  const pathname = usePathname()

  // Check if we are on the deal detail page: /pipeline/deal/[id]
  const isDealDetailPage = /^\/pipeline\/deal\/[^/]+$/.test(pathname)

  return (
    <main
      className={cn(
        'mt-4 min-h-0 flex-1 overflow-y-auto',
        !isDealDetailPage && 'p-4 md:p-8',
      )}
    >
      {children}
    </main>
  )
}
