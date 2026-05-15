import 'server-only'

import { LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { advanceContactLifecycle } from '@/_lib/lifecycle/advance-contact-lifecycle'
import { ensureDealHasPrimaryCaptureEvent } from '@/_lib/lifecycle/ensure-deal-capture-event'
import { revalidateTags } from '../tools/lib/revalidate-tags'

interface ApplyLifecycleTriggerInput {
  conversationId: string
  organizationId: string
  contactId: string
  toStage: LifecycleStage
  dealPipelineId?: string | null
}

interface ApplyLifecycleTriggerResult {
  applied: boolean
  toStage: LifecycleStage
  dealId?: string | null
}

export async function applyLifecycleTrigger(
  input: ApplyLifecycleTriggerInput,
): Promise<ApplyLifecycleTriggerResult> {
  const { conversationId, organizationId, contactId, toStage, dealPipelineId } = input

  const result = await advanceContactLifecycle({
    contactId,
    organizationId,
    toStage,
    causeType: LifecycleCauseType.AGENT_STEP_ADVANCED,
    causeRefId: conversationId,
  })

  if (!result.applied) return { applied: false, toStage }

  logger.info('lifecycle:agent_step_advanced', {
    conversationId,
    organizationId,
    contactId,
    toStage,
  })

  let createdDealId: string | null = null

  if (toStage === LifecycleStage.OPPORTUNITY) {
    try {
      createdDealId = await createDealForOpportunity({
        conversationId,
        organizationId,
        contactId,
        dealPipelineId: dealPipelineId ?? null,
      })
    } catch (dealErr) {
      logger.error('lifecycle:deal_creation_failed', {
        conversationId,
        error: dealErr instanceof Error ? dealErr.message : String(dealErr),
      })
    }
  }

  // revalidateTag do next/cache é no-op em contexto Trigger.dev —
  // usar revalidateTags (HTTP para API interna) para invalidar corretamente
  await revalidateTags([
    `contacts:${organizationId}`,
    `contact:${contactId}`,
    `dashboard:${organizationId}`,
    `reports:${organizationId}`,
    ...(createdDealId
      ? [`deals:${organizationId}`, `pipeline:${organizationId}`, `deals-options:${organizationId}`]
      : []),
  ])

  return { applied: true, toStage, dealId: createdDealId }
}

// ---------------------------------------------------------------------------
// Helpers privados
// ---------------------------------------------------------------------------

async function createDealForOpportunity(params: {
  conversationId: string
  organizationId: string
  contactId: string
  dealPipelineId: string | null
}): Promise<string | null> {
  const { conversationId, organizationId, contactId, dealPipelineId } = params

  // Reutilizar deal existente na conversa — evitar duplicata
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { dealId: true, assignedTo: true },
  })

  if (conversation?.dealId) return conversation.dealId

  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { name: true, assignedTo: true },
  })

  if (!contact) return null

  // Deal.assignedTo é required — usar contact.assignedTo ou conversation.assignedTo como fallback
  const assignedTo = contact.assignedTo ?? conversation?.assignedTo ?? null
  if (!assignedTo) {
    logger.warn('lifecycle:deal_creation_skipped_no_assignee', { conversationId, contactId })
    return null
  }

  // Resolver pipeline: parâmetro ou primeiro da org por createdAt (determinístico)
  const resolvedPipelineId = dealPipelineId ?? (await resolveDefaultPipelineId(organizationId))
  if (!resolvedPipelineId) {
    logger.warn('lifecycle:deal_creation_skipped_no_pipeline', { conversationId, organizationId })
    return null
  }

  const firstStage = await db.pipelineStage.findFirst({
    where: { pipelineId: resolvedPipelineId },
    orderBy: { position: 'asc' },
    select: { id: true },
  })

  if (!firstStage) return null

  const deal = await db.$transaction(async (tx) => {
    const newDeal = await tx.deal.create({
      data: {
        title: `Oportunidade — ${contact.name}`,
        organizationId,
        pipelineStageId: firstStage.id,
        assignedTo,
      },
    })

    await tx.dealContact.create({
      data: { dealId: newDeal.id, contactId, isPrimary: true },
    })

    await tx.conversation.update({
      where: { id: conversationId },
      data: { dealId: newDeal.id },
    })

    return newDeal
  })

  // Criar DealCaptureEvent via utilitário existente (non-fatal se source ausente)
  await ensureDealHasPrimaryCaptureEvent({ dealId: deal.id, organizationId })

  logger.info('lifecycle:deal_created_for_opportunity', {
    conversationId,
    dealId: deal.id,
    pipelineId: resolvedPipelineId,
  })

  return deal.id
}

async function resolveDefaultPipelineId(organizationId: string): Promise<string | null> {
  const pipeline = await db.pipeline.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return pipeline?.id ?? null
}
