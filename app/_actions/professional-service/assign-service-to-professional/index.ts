'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { assignServiceToProfessionalSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const assignServiceToProfessional = orgActionClient
  .schema(assignServiceToProfessionalSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão — usa entidade 'professional' (gestão da jornada/serviços)
    requirePermission(canPerformAction(ctx, 'professional', 'update'))

    // 2. Verificar que o profissional pertence à org e está ativo
    const professional = await db.professional.findFirst({
      where: { id: data.professionalId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!professional) {
      throw new Error('Profissional não encontrado.')
    }

    // 3. Verificar que o serviço pertence à org e está ativo
    const service = await db.service.findFirst({
      where: { id: data.serviceId, organizationId: ctx.orgId, isActive: true },
      select: { id: true },
    })

    if (!service) {
      throw new Error('Serviço não encontrado ou inativo.')
    }

    // 4. Criar o vínculo (idempotente via unique constraint — ignora se já existe)
    await db.professionalService.upsert({
      where: {
        professionalId_serviceId: {
          professionalId: data.professionalId,
          serviceId: data.serviceId,
        },
      },
      create: {
        organizationId: ctx.orgId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
      },
      update: {},
    })

    // 5. Invalidar cache do detalhe do profissional e listagem de serviços
    revalidateTag(`professional:${data.professionalId}`)
    revalidateTag(`services:${ctx.orgId}`)

    return { success: true }
  })
