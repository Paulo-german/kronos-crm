'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateProfessionalSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const updateProfessional = orgActionClient
  .schema(updateProfessionalSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base para editar profissional
    requirePermission(canPerformAction(ctx, 'professional', 'update'))

    // 2. Verificar que o profissional pertence à org
    const professional = await db.professional.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!professional) {
      throw new Error('Profissional não encontrado.')
    }

    // 3. Atualizar apenas campos fornecidos
    await db.professional.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })

    // 4. Invalidar cache do profissional e da listagem
    revalidateTag(`professionals:${ctx.orgId}`)
    revalidateTag(`professional:${data.id}`)

    return { success: true }
  })
