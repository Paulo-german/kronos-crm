'use server'

import { actionClient } from '@/_lib/safe-action'
import { registerAndAcceptProfessionalInviteSchema } from './schema'
import { db } from '@/_lib/prisma'
import { supabaseAdmin } from '@/_lib/supabase/admin'
import { createClient } from '@/_lib/supabase/server'
import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

export const registerAndAcceptProfessionalInvite = actionClient
  .schema(registerAndAcceptProfessionalInviteSchema)
  .action(async ({ parsedInput: { token, fullName, password } }) => {
    // 1. Buscar professional pelo token
    const professional = await db.professional.findFirst({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        userId: true,
        inviteExpiresAt: true,
        organizationId: true,
        organization: { select: { slug: true } },
      },
    })

    if (!professional) {
      throw new Error('Convite inválido ou não encontrado.')
    }

    // 2. Validar estado do convite
    if (!professional.inviteExpiresAt || professional.inviteExpiresAt < new Date()) {
      throw new Error('Este convite expirou. Solicite um novo ao administrador.')
    }

    if (professional.userId !== null) {
      throw new Error('Este convite já foi utilizado.')
    }

    if (!professional.email) {
      throw new Error('Convite inválido: sem e-mail cadastrado.')
    }

    // 3. Verificar que email não tem conta ainda
    const existingUser = await db.user.findUnique({
      where: { email: professional.email },
      select: { id: true },
    })

    if (existingUser) {
      throw new Error('Este email já possui uma conta. Faça login.')
    }

    // 4. Criar user no Supabase Auth (já confirmado, sem email de verificação)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: professional.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Erro ao criar conta.')
    }

    // 5. Criar user no Prisma (mesmo ID do Supabase)
    await db.user.create({
      data: {
        id: authData.user.id,
        email: professional.email,
        fullName,
      },
    })

    // 6. Sign in para criar sessão (cookies)
    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: professional.email,
      password,
    })

    if (signInError) {
      throw new Error(
        'Conta criada, mas erro ao fazer login. Tente logar manualmente.',
      )
    }

    // 7. Vincular userId ao profissional e limpar token
    await db.professional.update({
      where: { id: professional.id },
      data: {
        userId: authData.user.id,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    })

    // 8. Invalidar caches relevantes
    revalidateTag(`professional:${professional.id}`)
    revalidateTag(`professionals:${professional.organizationId}`)

    // 9. Redirect server-side
    redirect(`/org/${professional.organization.slug}/professional-portal`)
  })
