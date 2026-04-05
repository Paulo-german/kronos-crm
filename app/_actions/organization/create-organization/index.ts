'use server'

import { authActionClient } from '@/_lib/safe-action'
import { createOrganizationSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { generateSlug, ensureUniqueSlug } from '@/_lib/slug'

export const createOrganization = authActionClient
  .schema(createOrganizationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Gerar slug único
    const baseSlug = generateSlug(data.name)
    const slug = await ensureUniqueSlug(baseSlug)

    // Buscar email do usuário
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true },
    })

    if (!user) {
      throw new Error('Usuário não encontrado.')
    }

    // Criar organização e membro em uma transação
    const organization = await db.$transaction(async (tx) => {
      // Criar organização (sem trial — usuário precisa assinar um plano)
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug,
        },
      })

      // Criar membro como OWNER
      await tx.member.create({
        data: {
          organizationId: org.id,
          userId: ctx.userId,
          email: user.email,
          role: 'OWNER',
          status: 'ACCEPTED',
        },
      })

      // Criar CreditWallet (saldo é derivado: monthlyLimit - monthSpent + topUp)
      // planBalance=0 pois não é mais usado — mantido apenas por compatibilidade da coluna
      await tx.creditWallet.create({
        data: {
          organizationId: org.id,
          planBalance: 0,
        },
      })

      return org
    })

    revalidateTag(`user-orgs:${ctx.userId}`)
    revalidateTag(`membership:${ctx.userId}:${organization.slug}`)

    return { success: true, slug: organization.slug }
  })
