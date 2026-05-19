'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'

const DEV_EMAILS = ['paulo.roriz01@gmail.com', 'paulo.german777@gmail.com']

// Tags com padrão ${prefix}:${orgId} — cada entrada gera uma chamada revalidateTag.
const CACHE_TAG_PREFIXES_BY_ORG = [
  // CRM
  'pipeline',
  'deals',
  'deals-options',
  'contacts',
  'tasks',
  'products',
  'companies',
  'deal-lost-reasons',
  'appointments',
  'goals',
  // Reports
  'reports',
  // Dashboard
  'dashboard',
  'dashboard-charts',
  'dashboard-ai',
  // Inbox / Conversas
  'inboxes',
  'conversations',
  'conversation-labels',
  'copilot',
  // Agentes IA
  'agents',
  'agentGroups',
  'automations',
  'follow-ups-org',
  'integrations',
  // Billing / Plano
  'subscriptions',
  'credits',
  // Organização / Membros
  'org-members',
  'org-settings',
  'onboarding',
  // Módulos de serviço (agendamentos, profissionais etc.)
  'modules',
  'professionals',
  'promotions',
  'scheduling-settings',
  'service-categories',
  'services',
] as const

export const revalidateAllCache = orgActionClient.action(async ({ ctx }) => {
  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  })

  if (!user?.email || !DEV_EMAILS.includes(user.email)) {
    throw new Error('Ação restrita.')
  }

  for (const prefix of CACHE_TAG_PREFIXES_BY_ORG) {
    revalidateTag(`${prefix}:${ctx.orgId}`)
  }

  // organization usa slug como chave (não orgId) — tratado separadamente.
  revalidateTag(`organization:${ctx.orgSlug}`)

  // Tags por userId
  revalidateTag(`user:${ctx.userId}`)
  revalidateTag(`user-orgs:${ctx.userId}`)
  revalidateTag(`notifications:${ctx.userId}`)
  revalidateTag(`notification-preferences:${ctx.userId}`)
  revalidateTag(`user-profile:${ctx.userId}:${ctx.orgId}`)
  revalidateTag(`tutorials:${ctx.userId}:${ctx.orgId}`)

  const total = CACHE_TAG_PREFIXES_BY_ORG.length + 7
  return { revalidated: total }
})
