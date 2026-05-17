import 'server-only'
import { after } from 'next/server'
import { CustomerStatus, LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { revalidateLifecycleCache } from './revalidate-lifecycle-cache'
import {
  collectSignalsForContact,
  toContactSignals,
} from '../../../trigger/lib/collect-health-signals'
import { computeHealthScore } from '../../../trigger/lib/compute-health-score'
import { persistOne } from '../../../trigger/lib/persist-health-score'
import { revalidateCopilotCache } from '@/_lib/revalidate-copilot-cache'

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
  // Passa true quando o caller já gerencia o recálculo de score — evita double-write no ContactScoreHistory
  skipScoreUpdate?: boolean
}

export async function advanceContactLifecycle(
  params: AdvanceLifecycleParams,
): Promise<{ applied: boolean }> {
  const { contactId, organizationId, toStage, causeType, causeRefId, changedByUserId, skipScoreUpdate } = params

  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { lifecycleStage: true },
  })

  if (!contact) return { applied: false }

  // Monotonicity guard: só avança, nunca regride
  if (STAGE_ORDER[toStage] <= STAGE_ORDER[contact.lifecycleStage]) return { applied: false }

  const now = new Date()
  const timestampField = {
    QUALIFIED: { qualifiedAt: now },
    OPPORTUNITY: { becameOpportunityAt: now },
    CUSTOMER: { becameCustomerAt: now, customerStatus: CustomerStatus.ACTIVE },
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

  if (skipScoreUpdate) return { applied: true }

  // Recálculo de health score após a resposta ser enviada — não bloqueia o caller.
  after(async () => {
    try {
      const signals = await collectSignalsForContact(contactId, organizationId)
      if (!signals) return

      const result = computeHealthScore({
        contactId,
        organizationId,
        stage: toStage,
        signals: toContactSignals(signals),
      })
      await persistOne(result)
      revalidateCopilotCache(organizationId)
    } catch (error) {
      console.warn('[advanceContactLifecycle] Falha no recálculo de health score:', {
        contactId,
        organizationId,
        toStage,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  return { applied: true }
}
