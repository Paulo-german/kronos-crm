'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { cancelProfessionalInviteSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const cancelProfessionalInvite = orgActionClient
  .schema(cancelProfessionalInviteSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Apenas OWNER/ADMIN podem cancelar convites (remove o profissional)
    requirePermission(canPerformAction(ctx, 'professional', 'delete'))

    // 2. Buscar profissional sem userId — só convites pendentes podem ser cancelados
    const professional = await db.professional.findFirst({
      where: {
        id: data.professionalId,
        organizationId: ctx.orgId,
        userId: null,
      },
      select: { id: true },
    })

    if (!professional) {
      throw new Error('Profissional não encontrado ou já possui acesso vinculado.')
    }

    // 3. Remover o profissional (cascata via FK remove professionalService e workingHours)
    await db.professional.delete({ where: { id: professional.id } })

    // 4. Invalidar caches afetados
    revalidateTag(`professionals:${ctx.orgId}`)
    // Serviços também porque o vínculo ProfessionalService foi removido em cascata
    revalidateTag(`services:${ctx.orgId}`)

    return { success: true }
  })
