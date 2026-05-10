'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createProfessionalSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const createProfessional = orgActionClient
  .schema(createProfessionalSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base para criar profissionais
    requirePermission(canPerformAction(ctx, 'professional', 'create'))

    // 2. Sem quota no v1 — ver §3.2 do plano

    // 3. Se userId fornecido, verificar que o User pertence à org via Member
    if (data.userId) {
      const member = await db.member.findFirst({
        where: { userId: data.userId, organizationId: ctx.orgId },
      })

      if (!member) {
        throw new Error('Usuário não encontrado ou não pertence à organização.')
      }

      // Garantir que não há outro profissional já vinculado a este userId na org
      const existingProfessional = await db.professional.findFirst({
        where: { userId: data.userId },
      })

      if (existingProfessional) {
        throw new Error('Este usuário já está vinculado a um profissional.')
      }
    }

    // 4. Criar o profissional
    const professional = await db.professional.create({
      data: {
        organizationId: ctx.orgId,
        userId: data.userId ?? null,
        name: data.name,
        phone: data.phone ?? null,
        bio: data.bio ?? null,
        avatarUrl: data.avatarUrl ?? null,
      },
    })

    // 5. Invalidar cache
    revalidateTag(`professionals:${ctx.orgId}`)

    return { success: true, professionalId: professional.id }
  })
