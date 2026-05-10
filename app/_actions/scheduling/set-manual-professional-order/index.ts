'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { setManualProfessionalOrderSchema } from './schema'

export const setManualProfessionalOrder = orgActionClient
  .schema(setManualProfessionalOrderSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // Validar que todos os profissionais pertencem à org (prevenção de cross-org injection)
    const professionalIds = data.professionals.map((professional) => professional.professionalId)
    const count = await db.professional.count({
      where: { id: { in: professionalIds }, organizationId: ctx.orgId },
    })

    if (count !== professionalIds.length) {
      throw new Error('Um ou mais profissionais não pertencem a esta organização.')
    }

    // deleteMany + createMany em transação preserva a unique constraint [organizationId, order]
    // sem passar por estado intermediário que violaria a constraint
    await db.$transaction([
      db.manualProfessionalOrder.deleteMany({ where: { organizationId: ctx.orgId } }),
      db.manualProfessionalOrder.createMany({
        data: data.professionals.map((professional) => ({
          organizationId: ctx.orgId,
          professionalId: professional.professionalId,
          order: professional.order,
        })),
      }),
    ])

    revalidateTag(`scheduling-settings:${ctx.orgId}`)

    return { success: true }
  })
