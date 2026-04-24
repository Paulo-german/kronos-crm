import 'server-only'
import { createClient } from '@/_lib/supabase/server'

/**
 * Verifica se o usuário autenticado atual é o owner da plataforma.
 * A comparação é feita contra a variável de ambiente OWNER_EMAIL (server-side only).
 * O e-mail nunca é exposto ao cliente — apenas o booleano resultante é passado via props.
 */
export async function isCurrentUserOwner(): Promise<boolean> {
  const ownerEmail = process.env.OWNER_EMAIL
  if (!ownerEmail) return false

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.email?.toLowerCase() === ownerEmail.toLowerCase()
}
