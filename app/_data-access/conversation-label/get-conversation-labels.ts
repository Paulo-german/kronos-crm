import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface ConversationLabelDto {
  id: string
  name: string
  color: string
}

const fetchLabelsFromDb = async (orgId: string): Promise<ConversationLabelDto[]> => {
  return db.conversationLabel.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  })
}

export const getConversationLabels = cache(async (orgId: string): Promise<ConversationLabelDto[]> => {
  const getCached = unstable_cache(
    async () => fetchLabelsFromDb(orgId),
    ['conversation-labels', orgId],
    { tags: [`conversation-labels:${orgId}`] },
  )
  return getCached()
})
