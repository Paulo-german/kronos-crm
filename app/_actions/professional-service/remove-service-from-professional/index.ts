'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { removeServiceFromProfessionalSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const removeServiceFromProfessional = orgActionClient
  .schema(removeServiceFromProfessionalSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão — usa entidade 'professional' (gestão da jornada/serviços)
    requirePermission(canPerformAction(ctx, 'professional', 'update'))

    // 2. Verificar que o profissional pertence à org
    const professional = await db.professional.findFirst({
      where: { id: data.professionalId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!professional) {
      throw new Error('Profissional não encontrado.')
    }

    // 3. Verificar que o vínculo existe antes de tentar deletar
    const link = await db.professionalService.findUnique({
      where: {
        professionalId_serviceId: {
          professionalId: data.professionalId,
          serviceId: data.serviceId,
        },
      },
      select: { id: true },
    })

    if (!link) {
      throw new Error('Vínculo entre profissional e serviço não encontrado.')
    }

    // 4. Remover o vínculo
    await db.professionalService.delete({
      where: {
        professionalId_serviceId: {
          professionalId: data.professionalId,
          serviceId: data.serviceId,
        },
      },
    })

    // 5. Invalidar cache
    revalidateTag(`professional:${data.professionalId}`)
    revalidateTag(`services:${ctx.orgId}`)

    return { success: true }
  })
