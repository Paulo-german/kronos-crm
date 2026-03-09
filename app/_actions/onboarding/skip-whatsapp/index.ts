'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getBlueprint } from '@/_lib/onboarding/blueprints'

export const skipWhatsapp = orgActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    const org = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: {
        onboardingCompleted: true,
        niche: true,
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

    await db.$transaction(async (tx) => {
      // Pipeline: atualiza existente ou cria novo (seed mínimo, sem agent/inbox)
      const existingPipeline = await tx.pipeline.findFirst({
        where: { organizationId: ctx.orgId },
        select: { id: true },
      })

      let pipelineId: string

      if (existingPipeline) {
        pipelineId = existingPipeline.id
        await tx.pipelineStage.deleteMany({
          where: { pipelineId },
        })
      } else {
        const newPipeline = await tx.pipeline.create({
          data: {
            organizationId: ctx.orgId,
            name: 'Pipeline Principal',
          },
        })
        pipelineId = newPipeline.id
      }

      await tx.pipelineStage.createMany({
        data: blueprint.pipelineStages.map((stage) => ({
          pipelineId,
          name: stage.name,
          position: stage.position,
          color: stage.color,
        })),
      })

      // Seedar motivos de perda do blueprint (idempotente)
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

      // Marca onboarding como completo
      await tx.organization.update({
        where: { id: ctx.orgId },
        data: { onboardingCompleted: true },
      })
    })

    revalidateTag(`onboarding:${ctx.orgId}`)
    revalidateTag(`organization:${org.slug}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deal-lost-reasons:${ctx.orgId}`)

    return { success: true }
  })
