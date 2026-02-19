'use server'

import { authActionClient } from '@/_lib/safe-action'
import { createOrganizationSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Espaços viram hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .substring(0, 50) // Limita tamanho
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++
  }
}

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
      // Criar organização com trial de 7 dias no plano Essential
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug,
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

      // Criar CreditWallet com franquia do plano Essential (trial)
      const essentialPlan = await tx.plan.findUnique({
        where: { slug: 'essential' },
        select: { id: true },
      })

      let planBalance = 400 // Fallback se feature/plan não existir no DB

      if (essentialPlan) {
        const aiQuota = await tx.planLimit.findFirst({
          where: {
            planId: essentialPlan.id,
            feature: { key: 'ai.messages_quota' },
          },
          select: { valueNumber: true },
        })

        if (aiQuota?.valueNumber) {
          planBalance = aiQuota.valueNumber
        }
      }

      await tx.creditWallet.create({
        data: {
          organizationId: org.id,
          planBalance,
        },
      })

      return org
    })

    revalidateTag(`user-orgs:${ctx.userId}`)
    revalidateTag(`membership:${ctx.userId}:${organization.slug}`)

    return { success: true, slug: organization.slug }
  })
