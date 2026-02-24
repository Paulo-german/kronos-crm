'use server'

import { actionClient } from '@/_lib/safe-action'
import { registerAndAcceptInviteSchema } from './schema'
import { db } from '@/_lib/prisma'
import { supabaseAdmin } from '@/_lib/supabase/admin'
import { createClient } from '@/_lib/supabase/server'
import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

const INVITE_EXPIRATION_DAYS = 7

export const registerAndAcceptInvite = actionClient
  .schema(registerAndAcceptInviteSchema)
  .action(async ({ parsedInput: { token, fullName, password } }) => {
    // 1. Validar token (existe, PENDING, não expirado)
    const member = await db.member.findUnique({
      where: {
        invitationToken: token,
        status: 'PENDING',
      },
      include: {
        organization: {
          select: { slug: true },
        },
      },
    })

    if (!member) {
      throw new Error('Convite inválido ou expirado.')
    }

    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() - INVITE_EXPIRATION_DAYS)

    if (member.updatedAt < expirationDate) {
      throw new Error(
        'Este convite expirou. Peça um novo convite ao administrador.',
      )
    }

    // 2. Verificar que email não tem conta
    const existingUser = await db.user.findUnique({
      where: { email: member.email },
    })

    if (existingUser) {
      throw new Error('Este email já possui uma conta. Faça login.')
    }

    // 3. Criar user no Supabase Auth (já confirmado, sem email de verificação)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: member.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Erro ao criar conta.')
    }

    // 4. Criar user no Prisma (mesmo ID do Supabase)
    await db.user.create({
      data: {
        id: authData.user.id,
        email: member.email,
        fullName,
      },
    })

    // 5. Sign in para criar sessão (cookies)
    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: member.email,
      password,
    })

    if (signInError) {
      throw new Error('Conta criada, mas erro ao fazer login. Tente logar manualmente.')
    }

    // 6. Aceitar invite
    await db.member.update({
      where: { id: member.id },
      data: {
        status: 'ACCEPTED',
        userId: authData.user.id,
        invitationToken: null,
      },
    })

    // 7. Invalidar caches
    revalidateTag(`user-orgs:${authData.user.id}`)
    revalidateTag(`org-members:${member.organizationId}`)

    // 8. Redirect server-side (evita race condition com revalidateTag)
    redirect(`/org/${member.organization.slug}/dashboard`)
  })
