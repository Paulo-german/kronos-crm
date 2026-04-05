'use server'

import { createClient } from '@/_lib/supabase/server'
import { actionClient } from '@/_lib/safe-action'
import { SignUpSchema, signUpSchema } from './schema'
import prisma from '@/_lib/prisma'
import { redirect } from 'next/navigation'
import { verifyRecaptchaToken } from '@/_lib/recaptcha'
import { generateSlug, ensureUniqueSlug } from '@/_lib/slug'

export const signUp = actionClient
  .schema(signUpSchema)
  .action(
    async ({
      parsedInput: { fullName, companyName, phone, email, password, captchaToken },
    }: {
      parsedInput: SignUpSchema
    }) => {
      // 0. Verifica reCAPTCHA antes de qualquer operação
      await verifyRecaptchaToken(captchaToken)

      // 1. Verifica se já existe usuário com esse email
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        throw new Error('Este email já está cadastrado. Tente fazer login.')
      }

      // 2. Cria usuário no Supabase Auth
      const supabase = await createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
        },
      })

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Erro ao criar conta')
      }

      const userId = authData.user.id

      // 3. Gera slug único para a organização
      // Nota: a unique constraint em organizations.slug protege contra race conditions.
      const baseSlug = generateSlug(companyName)
      const slug = await ensureUniqueSlug(baseSlug)

      // 4. Transação atômica: User local + Organization + Member OWNER + CreditWallet
      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: userId,
            email,
            fullName,
            phone,
          },
        })

        const org = await tx.organization.create({
          data: {
            name: companyName,
            slug,
          },
        })

        await tx.member.create({
          data: {
            organizationId: org.id,
            userId,
            email,
            role: 'OWNER',
            status: 'ACCEPTED',
          },
        })

        await tx.creditWallet.create({
          data: {
            organizationId: org.id,
            planBalance: 0,
          },
        })
      })

      // 5. Redireciona para tela de verificação de email
      // Nota: não há cache a invalidar pois o usuário ainda não está autenticado.
      // O cache user-orgs:${userId} será populado corretamente na primeira leitura após login.
      redirect('/auth/verify-email')
    },
  )
