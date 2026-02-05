import { createSafeActionClient } from 'next-safe-action'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import type { MemberRole } from '@prisma/client'

// Cookie onde o middleware armazena o orgSlug da URL atual
export const ORG_SLUG_COOKIE = 'kronos-current-org-slug'

/**
 * Base action client - SEM autenticação
 * Use apenas para: login, signup, actions públicas
 */
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error('Action error:', e.message)
    return e.message || 'Ocorreu um erro no servidor. Tente novamente.'
  },
})

/**
 * Action client com autenticação OBRIGATÓRIA
 * Use para: actions que NÃO precisam de contexto de organização
 * (ex: criar organização, listar organizações do usuário)
 *
 * O ctx.userId estará disponível em todas as actions
 */
export const authActionClient = createSafeActionClient({
  handleServerError(e) {
    console.error('Action error:', e.message)
    return e.message || 'Ocorreu um erro no servidor. Tente novamente.'
  },
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
 * Action client com autenticação + contexto de organização
 * Use para: TODAS as actions que manipulam dados dentro de uma organização
 *
 * Disponibiliza no contexto:
 * - ctx.userId: ID do usuário autenticado
 * - ctx.orgId: ID da organização atual
 * - ctx.userRole: Papel do usuário na org (OWNER, ADMIN, MEMBER)
 */
export const orgActionClient = createSafeActionClient({
  handleServerError(e) {
    console.error('Action error:', e.message)
    return e.message || 'Ocorreu um erro no servidor. Tente novamente.'
  },
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

  return next({
    ctx: {
      userId: user.id,
      orgId: membership.orgId,
      userRole: membership.userRole as MemberRole,
    },
  })
})
