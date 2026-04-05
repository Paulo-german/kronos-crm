import { createSafeActionClient } from 'next-safe-action'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getOrgPiiSetting } from '@/_data-access/organization/get-org-pii-setting'
import { getEffectivePlan } from '@/_lib/rbac/plan-limits'
import { db } from '@/_lib/prisma'
import type { MemberRole } from '@prisma/client'

import { ORG_SLUG_COOKIE } from '@/_lib/constants'
export { ORG_SLUG_COOKIE }

const handleServerError = (e: Error) => {
  console.error('Action error:', e.message)
  return e.message || 'Ocorreu um erro no servidor. Tente novamente.'
}

/**
 * Base action client - SEM autenticação
 * Use apenas para: login, signup, actions públicas
 */
export const actionClient = createSafeActionClient({
  handleServerError,
})

/**
 * Action client com autenticação OBRIGATÓRIA
 * Use para: actions que NÃO precisam de contexto de organização
 * (ex: criar organização, listar organizações do usuário)
 *
 * O ctx.userId estará disponível em todas as actions
 */
export const authActionClient = createSafeActionClient({
  handleServerError,
}).use(async ({ next }) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Você precisa estar logado para realizar esta ação.')
  }

  return next({ ctx: { userId: user.id } })
})

/**
 * Base org client — auth + contexto de organização, SEM exigir plano ativo.
 * Use para: actions de billing/checkout que precisam funcionar sem plano
 * (ex: create-subscription, save-billing-data, create-setup-intent)
 *
 * Disponibiliza no contexto:
 * - ctx.userId, ctx.orgId, ctx.orgSlug, ctx.userRole, ctx.hidePiiFromMembers
 */
export const freeOrgActionClient = createSafeActionClient({
  handleServerError,
}).use(async ({ next }) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Você precisa estar logado para realizar esta ação.')
  }

  // Obter o orgSlug do cookie setado pelo middleware
  const cookieStore = await cookies()
  const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

  if (!orgSlug) {
    throw new Error('Organização não encontrada. Acesse via /org/[slug].')
  }

  // Validar que o usuário é membro da organização
  const membership = await validateMembership(user.id, orgSlug)

  if (!membership.isValid || !membership.orgId || !membership.userRole) {
    throw new Error('Você não tem acesso a esta organização.')
  }

  const orgId = membership.orgId
  const hidePiiFromMembers = await getOrgPiiSetting(orgId)

  return next({
    ctx: {
      userId: user.id,
      orgId,
      orgSlug,
      userRole: membership.userRole as MemberRole,
      hidePiiFromMembers,
    },
  })
})

/**
 * Action client com autenticação + contexto de organização + plano ativo obrigatório.
 * Use para: TODAS as actions que manipulam dados dentro de uma organização.
 *
 * Bloqueia chamadas de orgs sem plano ativo (trial, subscription ou override).
 * Para actions de billing/checkout, use `freeOrgActionClient` ao invés.
 */
export const orgActionClient = freeOrgActionClient.use(async ({ ctx, next }) => {
  const plan = await getEffectivePlan(ctx.orgId)

  if (!plan) {
    throw new Error('Assine um plano para realizar esta ação.')
  }

  return next({ ctx })
})

/**
 * Action client exclusivo para super admins (painel Delfos).
 * Herda autenticação do authActionClient e verifica isSuperAdmin no banco.
 * Use para: TODAS as actions do painel /admin que manipulam dados globais da plataforma.
 *
 * Disponibiliza no contexto:
 * - ctx.userId: ID do usuário autenticado e verificado como super admin
 */
export const superAdminActionClient = authActionClient.use(async ({ ctx, next }) => {
  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { isSuperAdmin: true },
  })

  if (!user?.isSuperAdmin) {
    throw new Error('Acesso negado.')
  }

  return next({ ctx })
})
