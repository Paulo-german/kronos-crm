'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resolveCanonicalAgentVersion } from '@/_lib/agent/agent-version'
import {
  globalToolsArraySchema,
  type GlobalTool,
  type GlobalToolType,
} from '@/_actions/agent/shared/global-tool-schema'
import { stepActionSchema } from '@/_actions/agent/shared/step-action-schema'
import { migrateStepToolsToGlobalSchema } from './schema'

const GLOBAL_TOOL_TYPES: readonly GlobalToolType[] = [
  'hand_off_to_human',
  'update_contact',
  'update_deal',
  'create_task',
]

function isGlobalToolType(type: string): type is GlobalToolType {
  return (GLOBAL_TOOL_TYPES as readonly string[]).includes(type)
}

/**
 * Deduplica tools do mesmo type extraídas de múltiplas etapas.
 * update_deal: faz união de allowedFields e allowedStatuses para preservar
 * configurações de etapas distintas. Os demais types usam a primeira ocorrência.
 */
function deduplicateExtractedTools(
  candidates: GlobalTool[],
): GlobalTool[] {
  const byType = new Map<GlobalToolType, GlobalTool[]>()

  for (const tool of candidates) {
    const existing = byType.get(tool.type) ?? []
    byType.set(tool.type, [...existing, tool])
  }

  const deduped: GlobalTool[] = []

  for (const [type, tools] of byType.entries()) {
    const first = tools[0]

    if (type === 'update_deal') {
      type UpdateDealTool = Extract<GlobalTool, { type: 'update_deal' }>
      const updateDealTools = tools as UpdateDealTool[]
      const firstUpdateDeal = updateDealTools[0]

      const mergedFields = Array.from(
        new Set(updateDealTools.flatMap((tool) => tool.allowedFields)),
      ) as UpdateDealTool['allowedFields']

      const mergedStatuses = Array.from(
        new Set(updateDealTools.flatMap((tool) => tool.allowedStatuses)),
      ) as UpdateDealTool['allowedStatuses']

      deduped.push({
        ...firstUpdateDeal,
        allowedFields: mergedFields,
        allowedStatuses: mergedStatuses,
      })
      continue
    }

    deduped.push(first)
  }

  return deduped
}

export const migrateStepToolsToGlobal = orgActionClient
  .schema(migrateStepToolsToGlobalSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const agent = await db.agent.findFirst({
      where: { id: parsedInput.agentId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentVersion: true,
        globalTools: true,
        steps: { select: { id: true, actions: true } },
      },
    })

    if (!agent) throw new Error('Agente não encontrado.')

    if (resolveCanonicalAgentVersion(agent.agentVersion) !== 'single-v2') {
      throw new Error('Migração de tools só é suportada para agentes v2.')
    }

    // Parsear globalTools já configuradas para preservar config manual existente
    const existingGlobalTools = globalToolsArraySchema.safeParse(
      agent.globalTools ?? [],
    )
    const alreadyConfiguredTypes = new Set(
      existingGlobalTools.success
        ? existingGlobalTools.data.map((tool) => tool.type)
        : [],
    )

    // Extrair tools globais de todos os steps, ignorando types já configurados
    const extractedCandidates: GlobalTool[] = []
    const stepsWithUpdatedActions: Array<{
      id: string
      newActions: z.infer<typeof stepActionSchema>[]
    }> = []

    for (const step of agent.steps) {
      const parsed = z.array(stepActionSchema).safeParse(step.actions)
      if (!parsed.success) continue

      const globalActions = parsed.data.filter(
        (action) =>
          isGlobalToolType(action.type) &&
          !alreadyConfiguredTypes.has(action.type as GlobalToolType),
      )

      if (globalActions.length === 0) continue

      // Candidatos para promoção a global tools (cast seguro — isGlobalToolType validou o type)
      for (const action of globalActions) {
        extractedCandidates.push(action as GlobalTool)
      }

      const remainingActions = parsed.data.filter(
        (action) => !isGlobalToolType(action.type),
      )
      stepsWithUpdatedActions.push({ id: step.id, newActions: remainingActions })
    }

    if (extractedCandidates.length === 0) {
      return { migratedCount: 0 }
    }

    const deduped = deduplicateExtractedTools(extractedCandidates)

    const mergedGlobalTools: GlobalTool[] = [
      ...(existingGlobalTools.success ? existingGlobalTools.data : []),
      ...deduped,
    ]

    const validationResult = globalToolsArraySchema.safeParse(mergedGlobalTools)
    if (!validationResult.success) {
      throw new Error(
        `Falha ao validar global tools mescladas: ${validationResult.error.message}`,
      )
    }

    await db.$transaction([
      db.agent.update({
        where: { id: parsedInput.agentId },
        data: { globalTools: validationResult.data },
      }),
      ...stepsWithUpdatedActions.map((step) =>
        db.agentStep.update({
          where: { id: step.id },
          data: { actions: step.newActions },
        }),
      ),
    ])

    revalidateTag(`agent:${parsedInput.agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { migratedCount: deduped.length }
  })
