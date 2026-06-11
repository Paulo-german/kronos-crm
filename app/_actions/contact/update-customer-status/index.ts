'use server'

import { LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { updateCustomerStatusSchema } from './schema'
import { db } from '@/_lib/prisma'
import {
  canPerformAction,
  canAccessRecord,
  requirePermission,
} from '@/_lib/rbac'
import { revalidateLifecycleCache } from '@/_lib/lifecycle/revalidate-lifecycle-cache'

export const updateCustomerStatus = orgActionClient
  .schema(updateCustomerStatusSchema)
  .action(async ({ parsedInput: { contactId, status }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'contact', 'update'))

    const contact = await db.contact.findFirst({
      where: { id: contactId, organizationId: ctx.orgId },
      select: { lifecycleStage: true, customerStatus: true, assignedTo: true },
    })

    if (!contact) throw new Error('Contato não encontrado.')
    requirePermission(canAccessRecord(ctx, { assignedTo: contact.assignedTo }))

    if (contact.lifecycleStage !== LifecycleStage.CUSTOMER) {
      throw new Error('Apenas clientes podem ter o status alterado.')
    }

    if (contact.customerStatus === status) {
      return { success: true, applied: false, status }
    }

    await db.$transaction([
      db.contact.update({
        where: { id: contactId, organizationId: ctx.orgId },
        data: { customerStatus: status },
      }),
      db.contactLifecycleHistory.create({
        data: {
          contactId,
          organizationId: ctx.orgId,
          fromStage: LifecycleStage.CUSTOMER,
          toStage: LifecycleStage.CUSTOMER,
          fromStatus: contact.customerStatus,
          toStatus: status,
          causeType: LifecycleCauseType.MANUAL,
          changedByUserId: ctx.userId,
        },
      }),
    ])

    revalidateLifecycleCache(ctx.orgId, contactId)

    return { success: true, applied: true, status }
  })
