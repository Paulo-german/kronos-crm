import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { maskEmail, maskPhone } from '@/_lib/pii-mask'
import type { CaptureChannel, CustomerStatus, DealStatus, LifecycleStage } from '@prisma/client'

export interface ContactDetailDto {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  isDecisionMaker: boolean
  companyId: string | null
  assignedTo: string | null
  company: {
    id: string
    name: string
  } | null
  deals: {
    id: string
    title: string
    status: DealStatus
  }[]
  createdAt: Date
  updatedAt: Date
  lifecycleStage: LifecycleStage
  customerStatus: CustomerStatus
  firstCaptureChannel: CaptureChannel | null
  firstCaptureAt: Date | null
  lastCaptureChannel: CaptureChannel | null
  lastCaptureAt: Date | null
  healthScore: number | null
  lastInteractionAt: Date | null
  qualifiedAt: Date | null
  becameOpportunityAt: Date | null
  becameCustomerAt: Date | null
  anonymizedAt: Date | null
}

const fetchContactByIdFromDb = async (
  contactId: string,
  orgId: string,
  userId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
): Promise<ContactDetailDto | null> => {
  const contact = await db.contact.findFirst({
    where: {
      id: contactId,
      organizationId: orgId,
      // RBAC: MEMBER só vê próprios, ADMIN/OWNER vê todos
      ...(elevated ? {} : { assignedTo: userId }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isDecisionMaker: true,
      companyId: true,
      assignedTo: true,
      createdAt: true,
      updatedAt: true,
      lifecycleStage: true,
      customerStatus: true,
      firstCaptureChannel: true,
      firstCaptureAt: true,
      lastCaptureChannel: true,
      lastCaptureAt: true,
      healthScore: true,
      lastInteractionAt: true,
      qualifiedAt: true,
      becameOpportunityAt: true,
      becameCustomerAt: true,
      anonymizedAt: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      deals: {
        select: {
          deal: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      },
    },
  })

  if (!contact) return null

  const masked = !elevated && hidePiiFromMembers

  return {
    id: contact.id,
    name: contact.name,
    email: masked ? maskEmail(contact.email) : contact.email,
    phone: masked ? maskPhone(contact.phone) : contact.phone,
    role: contact.role,
    isDecisionMaker: contact.isDecisionMaker,
    companyId: contact.companyId,
    assignedTo: contact.assignedTo,
    company: contact.company,
    deals: contact.deals.map((dealContact) => ({
      id: dealContact.deal.id,
      title: dealContact.deal.title,
      status: dealContact.deal.status,
    })),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    lifecycleStage: contact.lifecycleStage,
    customerStatus: contact.customerStatus,
    firstCaptureChannel: contact.firstCaptureChannel,
    firstCaptureAt: contact.firstCaptureAt,
    lastCaptureChannel: contact.lastCaptureChannel,
    lastCaptureAt: contact.lastCaptureAt,
    healthScore: contact.healthScore,
    lastInteractionAt: contact.lastInteractionAt,
    qualifiedAt: contact.qualifiedAt,
    becameOpportunityAt: contact.becameOpportunityAt,
    becameCustomerAt: contact.becameCustomerAt,
    anonymizedAt: contact.anonymizedAt,
  }
}

/**
 * Busca um contato específico por ID (Cacheado)
 * RBAC: MEMBER só vê contatos atribuídos a ele
 */
export const getContactById = cache(async (
  contactId: string,
  ctx: RBACContext,
): Promise<ContactDetailDto | null> => {
  const elevated = isElevated(ctx.userRole)
  const hidePiiFromMembers = ctx.hidePiiFromMembers ?? false

  const getCached = unstable_cache(
    async () => fetchContactByIdFromDb(contactId, ctx.orgId, ctx.userId, elevated, hidePiiFromMembers),
    [`contact-${contactId}-${ctx.userId}-${elevated}-${hidePiiFromMembers}`],
    {
      tags: [`contacts:${ctx.orgId}`, `contact:${contactId}`],
      revalidate: 3600,
    },
  )

  return getCached()
})
