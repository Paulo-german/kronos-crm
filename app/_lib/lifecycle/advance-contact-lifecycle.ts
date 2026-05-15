import { LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { revalidateLifecycleCache } from './revalidate-lifecycle-cache'

const STAGE_ORDER: Record<LifecycleStage, number> = {
  LEAD: 0,
  QUALIFIED: 1,
  OPPORTUNITY: 2,
  CUSTOMER: 3,
}

interface AdvanceLifecycleParams {
  contactId: string
  organizationId: string
  toStage: LifecycleStage
  causeType: LifecycleCauseType
  causeRefId?: string
  changedByUserId?: string
}

export async function advanceContactLifecycle(params: AdvanceLifecycleParams): Promise<void> {
  const { contactId, organizationId, toStage, causeType, causeRefId, changedByUserId } = params

  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { lifecycleStage: true },
  })

  if (!contact) return

  // Monotonicity guard: só avança, nunca regride
  if (STAGE_ORDER[toStage] <= STAGE_ORDER[contact.lifecycleStage]) return

  const now = new Date()
  const timestampField = {
    QUALIFIED: { qualifiedAt: now },
    OPPORTUNITY: { becameOpportunityAt: now },
    CUSTOMER: { becameCustomerAt: now },
    LEAD: {},
  }[toStage]

  await db.$transaction([
    db.contact.update({
      where: { id: contactId },
      data: {
        lifecycleStage: toStage,
        ...timestampField,
      },
    }),
    db.contactLifecycleHistory.create({
      data: {
        contactId,
        organizationId,
        fromStage: contact.lifecycleStage,
        toStage,
        causeType,
        causeRefId: causeRefId ?? null,
        changedByUserId: changedByUserId ?? null,
      },
    }),
  ])

  revalidateLifecycleCache(organizationId, contactId)
}
