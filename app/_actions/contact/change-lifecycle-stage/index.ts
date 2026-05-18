'use server'

import { DealStatus, LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { changeLifecycleStageSchema } from './schema'
import { db } from '@/_lib/prisma'
import {
  canPerformAction,
  canAccessRecord,
  requirePermission,
} from '@/_lib/rbac'
import { advanceContactLifecycle } from '@/_lib/lifecycle/advance-contact-lifecycle'
import { revalidateLifecycleCache } from '@/_lib/lifecycle/revalidate-lifecycle-cache'
import { LIFECYCLE_STAGE_ORDER } from '@/_lib/lifecycle/lifecycle-stage-config'

export const changeLifecycleStage = orgActionClient
  .schema(changeLifecycleStageSchema)
  .action(async ({ parsedInput: { contactId, toStage }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'contact', 'update'))

    const contact = await db.contact.findFirst({
      where: { id: contactId, organizationId: ctx.orgId },
      select: { lifecycleStage: true, assignedTo: true },
    })

    if (!contact) throw new Error('Contato não encontrado.')
    requirePermission(canAccessRecord(ctx, { assignedTo: contact.assignedTo }))

    const currentIndex = LIFECYCLE_STAGE_ORDER.indexOf(contact.lifecycleStage)
    const targetIndex = LIFECYCLE_STAGE_ORDER.indexOf(toStage)

    if (currentIndex === targetIndex) {
      return { success: true, applied: false, toStage }
    }

    const isAdvance = targetIndex > currentIndex

    if (isAdvance) {
      // Validar pré-requisitos de negociação antes de avançar
      if (toStage === LifecycleStage.OPPORTUNITY || toStage === LifecycleStage.CUSTOMER) {
        const dealCount = await db.dealContact.count({
          where: { contactId, deal: { organizationId: ctx.orgId } },
        })

        if (dealCount === 0) {
          throw new Error(
            'O contato precisa ter pelo menos uma negociação para avançar para Oportunidade ou Cliente.',
          )
        }
      }

      if (toStage === LifecycleStage.CUSTOMER) {
        const wonDealCount = await db.dealContact.count({
          where: {
            contactId,
            deal: { organizationId: ctx.orgId, status: DealStatus.WON },
          },
        })

        if (wonDealCount === 0) {
          throw new Error(
            'O contato precisa ter pelo menos uma negociação ganha para avançar para Cliente.',
          )
        }
      }

      await advanceContactLifecycle({
        contactId,
        organizationId: ctx.orgId,
        toStage,
        causeType: LifecycleCauseType.MANUAL,
        changedByUserId: ctx.userId,
      })

      return { success: true, applied: true, toStage }
    }

    // Downgrade: apenas ADMIN ou OWNER (SUPPORT e MEMBER não podem reverter)
    if (ctx.userRole !== 'ADMIN' && ctx.userRole !== 'OWNER') {
      throw new Error('Apenas administradores podem reverter o estágio do ciclo.')
    }

    await db.$transaction([
      db.contact.update({
        where: { id: contactId, organizationId: ctx.orgId },
        data: { lifecycleStage: toStage },
      }),
      db.contactLifecycleHistory.create({
        data: {
          contactId,
          organizationId: ctx.orgId,
          fromStage: contact.lifecycleStage,
          toStage,
          causeType: LifecycleCauseType.MANUAL,
          changedByUserId: ctx.userId,
        },
      }),
    ])

    revalidateLifecycleCache(ctx.orgId, contactId)

    return { success: true, applied: true, toStage }
  })
