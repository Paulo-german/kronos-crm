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

  // Apenas a tela de conversas precisa de full-bleed — inbox root ou conversa específica (UUID)
  const isInboxPage = /\/inbox(\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/.test(pathname)
  const isAgentDetailPage =
    /\/ai-agent\/(groups\/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      pathname,
    )

  const isFullBleed = isDealDetailPage || isInboxPage || isAgentDetailPage

  return (
    <main
      className={cn(
        'min-h-0 flex-1 rounded-tl-2xl rounded-bl-2xl bg-background',
        isAgentDetailPage ? 'flex overflow-hidden' : 'overflow-y-auto',
        !isFullBleed && 'p-4 md:p-8',
      )}
    >
      {children}
    </main>
  )
}
