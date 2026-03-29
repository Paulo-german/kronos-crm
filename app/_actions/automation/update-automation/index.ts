'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import { AutomationTrigger, AutomationAction } from '@prisma/client'
import { z } from 'zod'
import {
  updateAutomationSchema,
  dealStaleConfigSchema,
  dealIdleInStageConfigSchema,
  dealMovedConfigSchema,
  dealCreatedConfigSchema,
  activityCreatedConfigSchema,
  dealStatusChangedConfigSchema,
  reassignDealConfigSchema,
  moveDealToStageConfigSchema,
  markDealLostConfigSchema,
  notifyUserConfigSchema,
  updateDealPriorityConfigSchema,
} from './schema'

const TRIGGER_VALIDATORS: Record<AutomationTrigger, z.ZodTypeAny> = {
  [AutomationTrigger.DEAL_STALE]: dealStaleConfigSchema,
  [AutomationTrigger.DEAL_IDLE_IN_STAGE]: dealIdleInStageConfigSchema,
  [AutomationTrigger.DEAL_MOVED]: dealMovedConfigSchema,
  [AutomationTrigger.DEAL_CREATED]: dealCreatedConfigSchema,
  [AutomationTrigger.ACTIVITY_CREATED]: activityCreatedConfigSchema,
  [AutomationTrigger.DEAL_STATUS_CHANGED]: dealStatusChangedConfigSchema,
}

const ACTION_VALIDATORS: Record<AutomationAction, z.ZodTypeAny> = {
  [AutomationAction.REASSIGN_DEAL]: reassignDealConfigSchema,
  [AutomationAction.MOVE_DEAL_TO_STAGE]: moveDealToStageConfigSchema,
  [AutomationAction.MARK_DEAL_LOST]: markDealLostConfigSchema,
  [AutomationAction.NOTIFY_USER]: notifyUserConfigSchema,
  [AutomationAction.UPDATE_DEAL_PRIORITY]: updateDealPriorityConfigSchema,
}

export const updateAutomation = orgActionClient
  .schema(updateAutomationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Apenas ADMIN/OWNER pode editar automações
    requirePermission(canPerformAction(ctx, 'automation', 'update'))

    // 2. Verificar ownership + buscar tipos atuais do banco para validação cruzada de patches parciais
    const automation = await db.automation.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true, triggerType: true, actionType: true },
    })

    if (!automation) {
      throw new Error('Automação não encontrada.')
    }

    // 3. Validação cruzada de config vs tipo:
    //    Quando apenas um dos lados do par (config/type) vem no patch,
    //    combina com o valor persistido no banco para validar a compatibilidade.
    validateConfigAgainstTypes(
      data.triggerConfig,
      data.triggerType ?? automation.triggerType,
      data.actionConfig,
      data.actionType ?? automation.actionType,
    )

    // 4. Validações cross-entity: IDs referenciados devem pertencer à org
    if (data.triggerConfig !== undefined || data.actionConfig !== undefined) {
      await validatePartialCrossEntityReferences(
        data.triggerConfig,
        data.actionConfig,
        ctx.orgId,
      )
    }

    // 5. Construir payload apenas com campos fornecidos (partial update)
    await db.automation.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.triggerType !== undefined && { triggerType: data.triggerType }),
        ...(data.triggerConfig !== undefined && {
          triggerConfig: data.triggerConfig as unknown as Prisma.InputJsonValue,
        }),
        ...(data.conditions !== undefined && {
          conditions: data.conditions as unknown as Prisma.InputJsonValue,
        }),
        ...(data.actionType !== undefined && { actionType: data.actionType }),
        ...(data.actionConfig !== undefined && {
          actionConfig: data.actionConfig as unknown as Prisma.InputJsonValue,
        }),
      },
    })

    revalidateTag(`automations:${ctx.orgId}`)
    revalidateTag(`automation:${data.id}`)
    revalidatePath('/settings/automations')

    return { success: true }
  })

/**
 * Valida triggerConfig/actionConfig contra os tipos efetivos (fornecido ou lido do banco).
 * Garante que um patch parcial com apenas config não grave dados incompatíveis com o tipo salvo.
 */
function validateConfigAgainstTypes(
  triggerConfig: Record<string, unknown> | undefined,
  effectiveTriggerType: AutomationTrigger,
  actionConfig: Record<string, unknown> | undefined,
  effectiveActionType: AutomationAction,
): void {
  if (triggerConfig !== undefined) {
    const triggerResult = TRIGGER_VALIDATORS[effectiveTriggerType].safeParse(triggerConfig)
    if (!triggerResult.success) {
      throw new Error(
        `Configuração inválida para trigger ${effectiveTriggerType}: ${triggerResult.error.message}`,
      )
    }
  }

  if (actionConfig !== undefined) {
    const actionResult = ACTION_VALIDATORS[effectiveActionType].safeParse(actionConfig)
    if (!actionResult.success) {
      throw new Error(
        `Configuração inválida para ação ${effectiveActionType}: ${actionResult.error.message}`,
      )
    }
  }
}

/**
 * Valida referências cross-entity em updates parciais.
 * Aceita undefined em triggerConfig/actionConfig — valida apenas os campos presentes.
 */
async function validatePartialCrossEntityReferences(
  triggerConfig: Record<string, unknown> | undefined,
  actionConfig: Record<string, unknown> | undefined,
  orgId: string,
): Promise<void> {
  // Valida stageId no triggerConfig (DEAL_IDLE_IN_STAGE)
  if (typeof triggerConfig?.stageId === 'string') {
    await requireStageInOrg(triggerConfig.stageId, orgId)
  }

  // Valida targetStageId no actionConfig (MOVE_DEAL_TO_STAGE)
  if (typeof actionConfig?.targetStageId === 'string') {
    await requireStageInOrg(actionConfig.targetStageId, orgId)
  }

  // Valida targetUserIds no actionConfig (REASSIGN_DEAL / NOTIFY_USER)
  if (Array.isArray(actionConfig?.targetUserIds) && actionConfig.targetUserIds.length > 0) {
    await requireUsersInOrg(actionConfig.targetUserIds as string[], orgId)
  }

  // Valida lossReasonId no actionConfig (MARK_DEAL_LOST)
  if (typeof actionConfig?.lossReasonId === 'string') {
    await requireLossReasonInOrg(actionConfig.lossReasonId, orgId)
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
