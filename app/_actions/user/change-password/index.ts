'use server'

import { authActionClient } from '@/_lib/safe-action'
import { changePasswordSchema } from './schema'
import { createClient } from '@/_lib/supabase/server'

export const changePassword = authActionClient
  .schema(changePasswordSchema)
  .action(async ({ parsedInput: { currentPassword, newPassword } }) => {
    const supabase = await createClient()

    // Verificar senha atual fazendo login
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      throw new Error('Usuário não encontrado.')
    }

    // Tentar autenticar com a senha atual para validar
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      throw new Error('Senha atual incorreta.')
    }

    // Atualizar para nova senha
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      throw new Error('Erro ao atualizar senha. Tente novamente.')
    }

    return { success: true }
  })
