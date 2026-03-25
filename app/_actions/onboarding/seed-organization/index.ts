'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { seedOrganizationSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getBlueprint } from '@/_lib/onboarding/blueprints'
import type { PromptConfig } from '@/_actions/agent/shared/prompt-config-schema'
import type { NicheBlueprint } from '@/_lib/onboarding/blueprints/types'
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

    // -------------------------------------------------------------------------
    // Resolve o blueprint: caminho IA (generatedBlueprint) ou caminho legado (niche)
    // -------------------------------------------------------------------------
    let blueprint: NicheBlueprint
    let companyName: string
    let companyDescription: string
    let agentName: string

    if (data.generatedBlueprint) {
      // Caminho IA: marca o niche como 'ai_generated'
      await db.organization.update({
        where: { id: ctx.orgId },
        data: { niche: 'ai_generated' },
      })

      const gen = data.generatedBlueprint

      blueprint = {
        key: 'ai_generated',
        label: gen.configBundle.promptConfig.targetAudience,
        description: gen.companyDescription,
        icon: 'Bot',
        pipelineStages: gen.configBundle.pipelineStages,
        agentConfig: gen.configBundle.promptConfig,
        lostReasons: gen.configBundle.lostReasons,
        // Cast necessário: agentStepBlueprintSchema tem campos com .default() que geram tipos
        // levemente diferentes de BlueprintStepAction (campos opcionais vs obrigatórios com default).
        // Em runtime os dados são compatíveis — a conversão de targetStagePosition → UUID acontece abaixo.
        agentSteps: gen.agentSteps as unknown as NicheBlueprint['agentSteps'],
        systemPrompt: gen.systemPrompt,
        businessHoursEnabled: gen.configBundle.businessHoursEnabled,
        businessHoursConfig: gen.configBundle.businessHoursConfig,
        outOfHoursMessage: gen.configBundle.outOfHoursMessage,
      }

      companyName = gen.companyName
      companyDescription = gen.companyDescription
      agentName = gen.agentName
    } else {
      // Caminho legado: blueprint estático por niche
      if (!org.niche) {
        throw new Error('Selecione um segmento antes de continuar.')
      }

      blueprint = getBlueprint(org.niche)
      companyName = data.companyName || org.name
      companyDescription = data.companyDescription || `Empresa do segmento ${blueprint.label}`
      agentName = data.agentName || 'Assistente Kronos'
    }

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
        // Sempre substituir stages pelo blueprint selecionado
        await tx.pipelineStage.deleteMany({ where: { pipelineId } })
      } else {
        const newPipeline = await tx.pipeline.create({
          data: {
            organizationId: ctx.orgId,
            name: 'Pipeline Principal',
          },
        })
        pipelineId = newPipeline.id
      }

      // Criar stages do blueprint
      await tx.pipelineStage.createMany({
        data: blueprint.pipelineStages.map((stage) => ({
          pipelineId,
          name: stage.name,
          position: stage.position,
          color: stage.color,
        })),
      })

      // 2. Agent: reutiliza existente ou cria com promptConfig do blueprint
      const existingAgent = await tx.agent.findFirst({
        where: { organizationId: ctx.orgId },
        select: { id: true },
      })

      let agentId: string

      const promptConfig: PromptConfig = {
        ...blueprint.agentConfig,
        companyName,
        companyDescription,
      }

      if (existingAgent) {
        agentId = existingAgent.id
        await tx.agent.update({
          where: { id: agentId },
          data: {
            name: agentName,
            systemPrompt: blueprint.systemPrompt,
            promptConfig: promptConfig as unknown as Prisma.InputJsonValue,
            pipelineIds: [pipelineId],
            businessHoursEnabled: blueprint.businessHoursEnabled,
            businessHoursTimezone: 'America/Sao_Paulo',
            businessHoursConfig:
              blueprint.businessHoursConfig as unknown as Prisma.InputJsonValue,
            outOfHoursMessage: blueprint.outOfHoursMessage,
          },
        })
      } else {
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

      // 4. Seedar motivos de perda do blueprint (sempre recriar)
      await tx.dealLostReason.deleteMany({ where: { organizationId: ctx.orgId } })

      if (blueprint.lostReasons.length > 0) {
        await tx.dealLostReason.createMany({
          data: blueprint.lostReasons.map((name) => ({
            organizationId: ctx.orgId,
            name,
          })),
        })
      }

      // 5. Seedar etapas de atendimento do blueprint (sempre recriar)
      if (blueprint.agentSteps.length > 0) {
        await tx.agentStep.deleteMany({ where: { agentId } })

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
            actions:
              step.actions.length > 0
                ? step.actions.map((action) => {
                    if (action.type === 'move_deal') {
                      const stage = stages.find(
                        (s) => s.position === action.targetStagePosition,
                      )
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

    })

    // Invalida caches relevantes
    revalidateTag(`onboarding:${ctx.orgId}`)
    revalidateTag(`organization:${org.slug}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`agents:${ctx.orgId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    revalidateTag(`deal-lost-reasons:${ctx.orgId}`)

    return { success: true }
  })
