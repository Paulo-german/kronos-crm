import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { ConnectionType } from '@prisma/client'

export interface WhatsappInboxOption {
  id: string
  name: string
  connectionType: ConnectionType
  isActive: boolean
}

/**
 * Retorna TODOS os inboxes WhatsApp da org (incluindo Meta e inativos)
 * para que o select do wizard possa exibir opções desabilitadas com tooltip.
 */
export const getWhatsappInboxesForAutomation = cache(async (orgId: string): Promise<WhatsappInboxOption[]> => {
  const getCached = unstable_cache(
    async () =>
      db.inbox.findMany({
        where: { organizationId: orgId, channel: 'WHATSAPP' },
        select: { id: true, name: true, connectionType: true, isActive: true },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
    [`whatsapp-inboxes-automation-${orgId}`],
    { tags: [`inboxes:${orgId}`] },
  )
  return getCached()
})
