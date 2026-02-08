'use server'

import { cookies, headers } from 'next/headers'
import { orgActionClient, ORG_SLUG_COOKIE } from '@/_lib/safe-action'
import { createPortalSessionSchema } from './schema'
import { stripe } from '@/_lib/stripe'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const createPortalSession = orgActionClient
  .schema(createPortalSessionSchema)
  .action(async ({ ctx }) => {
    // 1. Verificar permissão: apenas OWNER/ADMIN podem gerenciar billing
    requirePermission(canPerformAction(ctx, 'billing', 'update'))

    // 2. Buscar orgSlug para construir return_url
    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      throw new Error('Organização não encontrada.')
    }

    // 3. Obter origin da requisição
    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3000'

    // 4. Buscar stripeCustomerId da organização
    const org = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { stripeCustomerId: true },
    })

    if (!org.stripeCustomerId) {
      throw new Error('Nenhuma assinatura encontrada para esta organização.')
    }

    // 5. Criar sessão do Customer Portal
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${origin}/org/${orgSlug}/settings/billing`,
    })

    return { url: session.url }
  })
