import { createSafeActionClient } from 'next-safe-action'
import { createClient } from '@/_lib/supabase/server'

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
 * Use para: TODAS as actions que manipulam dados do usuário
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

  // Passa o userId para todas as actions que usarem este client
  return next({ ctx: { userId: user.id } })
})
