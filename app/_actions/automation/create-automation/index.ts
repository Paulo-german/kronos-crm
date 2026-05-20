'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission, requireQuota } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import { createAutomationSchema, SENTINEL_DEAL_INBOX } from './schema'

export const createAutomation = orgActionClient
  .schema(createAutomationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Apenas ADMIN/OWNER pode criar automações
    requirePermission(canPerformAction(ctx, 'automation', 'create'))

    // 2. Verificar quota do plano
    await requireQuota(ctx.orgId, 'automation')

    // 3. Validações cross-entity: verificar que referências existem e pertencem à org
    await validateCrossEntityReferences(data.triggerConfig, data.actionConfig, ctx.orgId)

    // 4. Forçar createdBy via contexto (nunca confiar no client)
    const automation = await db.automation.create({
      data: {
        organizationId: ctx.orgId,
        createdBy: ctx.userId,
        name: data.name,
        description: data.description ?? null,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig as unknown as Prisma.InputJsonValue,
        conditions: data.conditions as unknown as Prisma.InputJsonValue,
        actionType: data.actionType,
        actionConfig: data.actionConfig as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    })

    revalidateTag(`automations:${ctx.orgId}`)
    revalidatePath('/settings/automations')

    return { success: true, automationId: automation.id }
  })

/**
 * Valida que referências de IDs (stages, usuários, lossReasons) existem e pertencem à org.
 * Centralizado aqui para evitar duplicação entre create e update.
 */
async function validateCrossEntityReferences(
  triggerConfig: Record<string, unknown>,
  actionConfig: Record<string, unknown>,
  orgId: string,
): Promise<void> {
  // Valida stageId no triggerConfig (DEAL_IDLE_IN_STAGE)
  if (typeof triggerConfig.stageId === 'string') {
    await requireStageInOrg(triggerConfig.stageId, orgId)
  }

  // Valida targetStageId no actionConfig (MOVE_DEAL_TO_STAGE)
  if (typeof actionConfig.targetStageId === 'string') {
    await requireStageInOrg(actionConfig.targetStageId, orgId)
  }

  // Valida targetUserIds no actionConfig (REASSIGN_DEAL / NOTIFY_USER)
  if (Array.isArray(actionConfig.targetUserIds) && actionConfig.targetUserIds.length > 0) {
    await requireUsersInOrg(actionConfig.targetUserIds as string[], orgId)
  }

  // Valida lossReasonId no actionConfig (MARK_DEAL_LOST)
  if (typeof actionConfig.lossReasonId === 'string') {
    await requireLossReasonInOrg(actionConfig.lossReasonId, orgId)
  }

  // Valida inboxId no actionConfig (SEND_WHATSAPP_FOLLOWUP) — pula para o sentinela 'deal_inbox'
  if (typeof actionConfig.inboxId === 'string' && actionConfig.inboxId !== SENTINEL_DEAL_INBOX) {
    await requireWhatsappInboxInOrg(actionConfig.inboxId, orgId)
  }

  // Valida assignToUserId no actionConfig (CREATE_TASK)
  if (typeof actionConfig.assignToUserId === 'string') {
    await requireUsersInOrg([actionConfig.assignToUserId], orgId)
  }
}

async function requireStageInOrg(stageId: string, orgId: string): Promise<void> {
  const stage = await db.pipelineStage.findFirst({
    where: { id: stageId, pipeline: { organizationId: orgId } },
    select: { id: true },
  })

  if (!stage) {
    throw new Error('Estágio não encontrado ou não pertence à organização.')
  }
}

async function requireUsersInOrg(userIds: string[], orgId: string): Promise<void> {
  const members = await db.member.findMany({
    where: {
      organizationId: orgId,
      status: 'ACCEPTED',
      user: { id: { in: userIds } },
    },
    select: { userId: true },
  })

  if (members.length !== userIds.length) {
    throw new Error('Um ou mais usuários não são membros ativos da organização.')
  }
}

async function requireLossReasonInOrg(lossReasonId: string, orgId: string): Promise<void> {
  const lossReason = await db.dealLostReason.findFirst({
    where: { id: lossReasonId, organizationId: orgId, isActive: true },
    select: { id: true },
  })

  if (!lossReason) {
    throw new Error('Motivo de perda não encontrado ou inativo.')
  }
}

async function requireWhatsappInboxInOrg(inboxId: string, orgId: string): Promise<void> {
  const inbox = await db.inbox.findFirst({
    where: { id: inboxId, organizationId: orgId },
    select: { isActive: true, channel: true, connectionType: true },
  })

  if (!inbox) {
    throw new Error('Inbox selecionado não foi encontrado.')
  }

  if (!inbox.isActive) {
    throw new Error('Inbox selecionado está inativo.')
  }

  if (inbox.channel !== 'WHATSAPP') {
    throw new Error('Inbox selecionado não é um canal WhatsApp.')
  }

  // Meta Cloud API requer templates pré-aprovados — suporte futuro
  if (inbox.connectionType === 'META_CLOUD') {
    throw new Error('Inboxes da API Oficial (Meta) não são suportados nesta ação. Use Evolution ou Z-API.')
  }
}
