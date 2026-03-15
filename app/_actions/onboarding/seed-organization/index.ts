'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { seedOrganizationSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getBlueprint } from '@/_lib/onboarding/blueprints'
import type { PromptConfig } from '@/_actions/agent/shared/prompt-config-schema'
import type { Prisma } from '@prisma/client'

export const seedOrganization = orgActionClient
  .schema(seedOrganizationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    const org = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: {
        onboardingCompleted: true,
        niche: true,
        name: true,
        slug: true,
      },
    })

    if (org.onboardingCompleted) {
      return { success: true, alreadyCompleted: true }
    }

    if (!org.niche) {
      throw new Error('Selecione um segmento antes de continuar.')
    }

    const blueprint = getBlueprint(org.niche)
    const companyName = data.companyName || org.name
    const companyDescription = data.companyDescription || `Empresa do segmento ${blueprint.label}`
    const agentName = data.agentName || 'Assistente Kronos'

    // Busca inbox WhatsApp (se conectada no step anterior)
    const inbox = await db.inbox.findFirst({
      where: {
        organizationId: ctx.orgId,
        channel: 'WHATSAPP',
      },
      select: { id: true },
    })

    await db.$transaction(async (tx) => {
      // 1. Pipeline: atualiza existente ou cria novo
      const existingPipeline = await tx.pipeline.findFirst({
        where: { organizationId: ctx.orgId },
        select: { id: true },
      })

      let pipelineId: string

      if (existingPipeline) {
        pipelineId = existingPipeline.id

        // Se já existem stages com deals vinculados, mantém os existentes
        const stageCount = await tx.pipelineStage.count({
          where: { pipelineId },
        })

        if (stageCount === 0) {
          // Pipeline vazio — cria stages do blueprint
          await tx.pipelineStage.createMany({
            data: blueprint.pipelineStages.map((stage) => ({
              pipelineId,
              name: stage.name,
              position: stage.position,
              color: stage.color,
            })),
          })
        }
      } else {
        const newPipeline = await tx.pipeline.create({
          data: {
            organizationId: ctx.orgId,
            name: 'Pipeline Principal',
          },
        })
        pipelineId = newPipeline.id

        // Cria stages do blueprint
        await tx.pipelineStage.createMany({
          data: blueprint.pipelineStages.map((stage) => ({
            pipelineId,
            name: stage.name,
            position: stage.position,
            color: stage.color,
          })),
        })
      }

      // 2. Agent: reutiliza existente ou cria com promptConfig do blueprint
      const existingAgent = await tx.agent.findFirst({
        where: { organizationId: ctx.orgId },
        select: { id: true },
      })

      let agentId: string

      if (existingAgent) {
        agentId = existingAgent.id
      } else {
        const promptConfig: PromptConfig = {
          ...blueprint.agentConfig,
          companyName,
          companyDescription,
        }

        const agent = await tx.agent.create({
          data: {
            organizationId: ctx.orgId,
            name: agentName,
            systemPrompt: blueprint.systemPrompt,
            promptConfig: promptConfig as unknown as Prisma.InputJsonValue,
            isActive: true,
            pipelineIds: [pipelineId],
            businessHoursEnabled: blueprint.businessHoursEnabled,
            businessHoursTimezone: 'America/Sao_Paulo',
            businessHoursConfig:
              blueprint.businessHoursConfig as unknown as Prisma.InputJsonValue,
            outOfHoursMessage: blueprint.outOfHoursMessage,
          },
        })
        agentId = agent.id
      }

      // 3. Link Agent -> Inbox e Inbox -> Pipeline (se inbox existe)
      if (inbox) {
        await tx.inbox.update({
          where: { id: inbox.id },
          data: {
            agentId: agentId,
            pipelineId,
            distributionUserIds: [ctx.userId],
          },
        })
      }

      // 4. Seedar motivos de perda do blueprint (idempotente)
      const existingReasons = await tx.dealLostReason.count({
        where: { organizationId: ctx.orgId },
      })

      if (existingReasons === 0 && blueprint.lostReasons.length > 0) {
        await tx.dealLostReason.createMany({
          data: blueprint.lostReasons.map((name) => ({
            organizationId: ctx.orgId,
            name,
          })),
        })
      }

      // 5. Seedar etapas de atendimento do blueprint (só se agent novo)
      if (!existingAgent && blueprint.agentSteps.length > 0) {
        const stages = await tx.pipelineStage.findMany({
          where: { pipelineId },
          orderBy: { position: 'asc' },
          select: { id: true, position: true },
        })

        await tx.agentStep.createMany({
          data: blueprint.agentSteps.map((step) => ({
            agentId,
            name: step.name,
            objective: step.objective,
            actions: step.actions.length > 0
              ? step.actions.map((action) => {
                  if (action.type === 'move_deal') {
                    const stage = stages.find((s) => s.position === action.targetStagePosition)
                    return {
                      type: action.type,
                      trigger: action.trigger,
                      targetStage: stage?.id ?? '',
                    }
                  }
                  return action
                })
              : undefined,
            keyQuestion: step.keyQuestion,
            messageTemplate: step.messageTemplate,
            order: step.order,
          })),
        })
      }

      // 6. Marca onboarding como completo
      await tx.organization.update({
        where: { id: ctx.orgId },
        data: { onboardingCompleted: true },
      })
    })

    // Invalida caches relevantes (exceto onboarding — será revalidado pela action completeOnboarding
    // após a tela de celebração)
    revalidateTag(`organization:${org.slug}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`agents:${ctx.orgId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    revalidateTag(`deal-lost-reasons:${ctx.orgId}`)

    return { success: true }
  })
