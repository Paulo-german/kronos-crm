import 'server-only'
import {
  CustomerStatus,
  LifecycleCauseType,
  LifecycleStage,
} from '@prisma/client'
import { db } from '@/_lib/prisma'
import { revalidateLifecycleCache } from './revalidate-lifecycle-cache'

interface ReactivateCustomerIfDormantParams {
  contactId: string
  organizationId: string
  causeRefId: string
  changedByUserId: string | null
}

export async function reactivateCustomerIfDormant(
  params: ReactivateCustomerIfDormantParams,
): Promise<{ applied: boolean }> {
  const { contactId, organizationId, causeRefId, changedByUserId } = params

  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { lifecycleStage: true, customerStatus: true },
  })

  if (!contact) return { applied: false }
  if (contact.lifecycleStage !== LifecycleStage.CUSTOMER)
    return { applied: false }
  if (contact.customerStatus === CustomerStatus.ACTIVE)
    return { applied: false }

  await db.$transaction([
    db.contact.update({
      where: { id: contactId },
      data: { customerStatus: CustomerStatus.ACTIVE },
    }),
    db.contactLifecycleHistory.create({
      data: {
        contactId,
        organizationId,
        fromStage: LifecycleStage.CUSTOMER,
        toStage: LifecycleStage.CUSTOMER,
        fromStatus: contact.customerStatus,
        toStatus: CustomerStatus.ACTIVE,
        causeType: LifecycleCauseType.DEAL_WON,
        causeRefId,
        changedByUserId: changedByUserId ?? null,
      },
    }),
  ])

  revalidateLifecycleCache(organizationId, contactId)

  return { applied: true }
}
