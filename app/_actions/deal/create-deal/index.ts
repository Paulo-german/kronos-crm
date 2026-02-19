'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createDealSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  canPerformAction,
  requirePermission,
  requireQuota,
  resolveAssignedTo,
} from '@/_lib/rbac'

export const createDeal = orgActionClient
  .schema(createDealSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'create'))

    // 2. Verificar quota do plano
    await requireQuota(ctx.orgId, 'deal')

    // 3. Resolver assignedTo (MEMBER = forçado para si mesmo)
    const assignedTo = resolveAssignedTo(ctx, data.assignedTo)

    // 4. Verifica ownership da stage via organização
    const stage = await db.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        pipeline: {
          organizationId: ctx.orgId,
        },
      },
    })

    if (!stage) {
      throw new Error('Etapa não encontrada.')
    }

    const contact = data.contactId
      ? await db.contact.findFirst({
          where: {
            id: data.contactId,
            organizationId: ctx.orgId,
          },
        })
      : null

    if (data.contactId && !contact) {
      throw new Error('Contato não encontrado.')
    }

    if (data.companyId) {
      const company = await db.company.findFirst({
        where: {
          id: data.companyId,
          organizationId: ctx.orgId,
        },
      })
      if (!company) {
        throw new Error('Empresa não encontrada.')
      }
    }

    const deal = await db.deal.create({
      data: {
        organizationId: ctx.orgId,
        title: data.title,
        pipelineStageId: data.stageId,
        contacts: data.contactId
          ? {
              create: {
                contactId: data.contactId,
                isPrimary: true,
                role: contact?.role ?? '',
              },
            }
          : undefined,
        companyId: data.companyId || null,
        expectedCloseDate: data.expectedCloseDate || null,
        assignedTo,
      },
    })

    revalidatePath('/pipeline')
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)

    return { success: true, dealId: deal.id }
  })
