'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission, requireQuota } from '@/_lib/rbac'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { globalToolsArraySchema } from '../shared/global-tool-schema'
import { importAgentSchema } from './schema'
import { sanitizeImport } from './sanitize-import'
import { remapGlobalToolStepIds } from './remap-global-tools'

export const importAgent = orgActionClient
  .schema(importAgentSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'create'))
    await requireQuota(ctx.orgId, 'agent')

    const user = await getUserById(ctx.userId)
    const isSuperAdmin = Boolean(user?.isSuperAdmin)

    const { sanitized, warnings } = sanitizeImport(parsedInput, { isSuperAdmin })
    const agent = sanitized.agent

    const result = await db.$transaction(async (tx) => {
      const createdAgent = await tx.agent.create({
        data: {
          organizationId: ctx.orgId,
          name: agent.name,
          systemPrompt: agent.systemPrompt,
          promptConfig: agent.promptConfig ?? Prisma.DbNull,
          modelId: agent.modelId,
          agentVersion: agent.agentVersion,
          agentMode: agent.agentMode,
          debounceSeconds: agent.debounceSeconds,
          isActive: agent.isActive,
          businessHoursEnabled: agent.businessHoursEnabled,
          businessHoursTimezone: agent.businessHoursTimezone,
          businessHoursConfig: agent.businessHoursConfig ?? Prisma.DbNull,
          outOfHoursMessage: agent.outOfHoursMessage,
          followUpBusinessHoursEnabled: agent.followUpBusinessHoursEnabled,
          followUpBusinessHoursTimezone: agent.followUpBusinessHoursTimezone,
          followUpBusinessHoursConfig:
            agent.followUpBusinessHoursConfig ?? Prisma.DbNull,
          followUpExhaustedAction: agent.followUpExhaustedAction,
          followUpExhaustedConfig:
            agent.followUpExhaustedConfig ?? Prisma.DbNull,
          // globalTools entram só após criar os steps (remap de orders → ids novos).
          globalTools: Prisma.JsonNull,
        },
      })

      const orderToNewId = new Map<number, string>()
      for (const step of agent.steps) {
        const createdStep = await tx.agentStep.create({
          data: {
            agentId: createdAgent.id,
            name: step.name,
            objective: step.objective,
            allowedActions: step.allowedActions,
            activationRequirement: step.activationRequirement,
            order: step.order,
            actions:
              step.actions && step.actions.length > 0
                ? step.actions
                : Prisma.JsonNull,
            keyQuestion: step.keyQuestion,
            messageTemplate: step.messageTemplate,
            lifecycleTrigger: step.lifecycleTrigger,
            lifecycleDealPipelineId: step.lifecycleDealPipelineId,
            autoDealStageId: step.autoDealStageId,
            autoTasks:
              step.autoTasks && step.autoTasks.length > 0
                ? step.autoTasks
                : Prisma.JsonNull,
          },
        })
        orderToNewId.set(step.order, createdStep.id)
      }

      const { remapped, warnings: remapWarnings } = remapGlobalToolStepIds(
        agent.globalTools,
        orderToNewId,
      )

      // Revalida o resultado remapeado com o schema estrito (stepIds UUID) antes
      // de persistir — aborta a transação se algo ficou corrompido.
      const validatedTools = globalToolsArraySchema.safeParse(remapped)
      if (!validatedTools.success) {
        throw new Error('Falha ao processar ferramentas globais do agente.')
      }

      await tx.agent.update({
        where: { id: createdAgent.id },
        data: {
          globalTools:
            validatedTools.data.length > 0
              ? (validatedTools.data as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      })

      return { agentId: createdAgent.id, remapWarnings }
    })

    revalidateTag(`agents:${ctx.orgId}`)

    return {
      success: true,
      agentId: result.agentId,
      warnings: [...warnings, ...result.remapWarnings],
    }
  })
