import 'server-only'

import { LifecycleCauseType } from '@prisma/client'
import { advanceContactLifecycle } from '@/_lib/lifecycle/advance-contact-lifecycle'
import type { ExecutorContext, ExecutorResult, UpdateContactLifecycleConfig } from '../types'

/**
 * Executor que avança o estágio de lifecycle de todos os contatos vinculados ao deal.
 * Delegação total para advanceContactLifecycle (monotônico + histórico + cache).
 * causeType MANUAL = avanco configurado por automacao do admin, sem ator humano.
 */
export async function executeUpdateContactLifecycle(
  ctx: ExecutorContext,
): Promise<ExecutorResult> {
  if (!ctx.deal) return { summary: { skipped: true, reason: 'subject_not_deal' } }
  const config = ctx.actionConfig as unknown as UpdateContactLifecycleConfig

  const contactIds = ctx.deal.contacts.map((dealContact) => dealContact.contactId)

  if (contactIds.length === 0) {
    return {
      summary: {
        skipped: true,
        reason: 'no_contacts',
        dealId: ctx.deal.id,
      },
    }
  }

  let advanced = 0
  let skipped = 0

  for (const contactId of contactIds) {
    const result = await advanceContactLifecycle({
      contactId,
      organizationId: ctx.orgId,
      toStage: config.targetStage,
      causeType: LifecycleCauseType.MANUAL,
      causeRefId: ctx.deal.id,
    })
    if (result.applied) {
      advanced += 1
    } else {
      skipped += 1
    }
  }

  return {
    summary: {
      targetStage: config.targetStage,
      advanced,
      skipped,
      contactCount: contactIds.length,
    },
  }
}
