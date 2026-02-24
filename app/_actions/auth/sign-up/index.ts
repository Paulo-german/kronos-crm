'use server'

import { createClient } from '@/_lib/supabase/server'
import { actionClient } from '@/_lib/safe-action'
import { SignUpSchema, signUpSchema } from './schema'
import prisma from '@/_lib/prisma'
import { redirect } from 'next/navigation'
import { verifyRecaptchaToken } from '@/_lib/recaptcha'

export const signUp = actionClient
  .schema(signUpSchema)
  .action(
    async ({
      parsedInput: { fullName, email, password, captchaToken },
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

      // 1. Cria usuário no Supabase Auth
      const supabase = await createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Erro ao criar conta')
      }

      // 2. Cria usuário no DB local (Prisma)
      // Usamos o mesmo ID gerado pelo Supabase para manter consistência
      await prisma.user.create({
        data: {
          id: authData.user.id,
          email: email,
          fullName: fullName,
          // Role default já é 'owner' pelo schema do Prisma
        },
      })

      // 3. Redireciona para tela de verificação de email
      redirect('/auth/verify-email')
    },
  )
