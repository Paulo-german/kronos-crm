'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'

const DEV_EMAILS = ['paulo.roriz01@gmail.com', 'paulo.german777@gmail.com']

const CACHE_TAG_PREFIXES = [
  'pipeline',
  'deals',
  'contacts',
  'tasks',
  'products',
  'companies',
  'subscriptions',
  'org-members',
  'deal-lost-reasons',
  'organization',
  'agents',
] as const

export const revalidateAllCache = orgActionClient.action(async ({ ctx }) => {
  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  })

  if (!user?.email || !DEV_EMAILS.includes(user.email)) {
    throw new Error('Ação restrita.')
  }

  for (const prefix of CACHE_TAG_PREFIXES) {
    revalidateTag(`${prefix}:${ctx.orgId}`)
  }

  // Tags por userId
  revalidateTag(`user:${ctx.userId}`)
  revalidateTag(`user-orgs:${ctx.userId}`)

  return { revalidated: CACHE_TAG_PREFIXES.length + 2 }
})
