/**
 * Migração de dados legados: allowedActions[] + activationRequirement → actions JSON + keyQuestion
 *
 * Converte steps que ainda usam o formato antigo para o novo formato estruturado.
 * Idempotente: só processa steps onde `actions IS NULL`.
 *
 * Rodar com: npx tsx scripts/migrate-step-actions.ts
 */

import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ACTION_TYPE_MAP: Record<string, string> = {
  move_deal: 'move_deal',
  update_contact: 'update_contact',
  update_deal: 'update_deal',
  create_task: 'create_task',
  create_appointment: 'create_appointment',
  search_knowledge: 'search_knowledge',
  hand_off_to_human: 'hand_off_to_human',
}

function buildAction(allowedAction: string): Record<string, unknown> | null {
  const type = ACTION_TYPE_MAP[allowedAction]
  if (!type) {
    console.warn(`  ⚠ Ação desconhecida: "${allowedAction}" — ignorada`)
    return null
  }

  const base = {
    type,
    trigger: `Quando necessário executar ${type.replace(/_/g, ' ')}`,
  }

  if (type === 'move_deal') {
    return { ...base, targetStage: '[CONFIGURAR]' }
  }

  if (type === 'create_task') {
    return { ...base, title: '[CONFIGURAR]' }
  }

  if (type === 'create_appointment') {
    return { ...base, title: '[CONFIGURAR]' }
  }

  return base
}

async function main() {
  const steps = await prisma.agentStep.findMany({
    where: { actions: { equals: Prisma.JsonNull } },
    select: {
      id: true,
      name: true,
      allowedActions: true,
      activationRequirement: true,
    },
  })

  console.log(`\nEncontrados ${steps.length} steps para migrar\n`)

  if (steps.length === 0) {
    console.log('Nenhum step precisa de migração.')
    return
  }

  let migrated = 0
  let skipped = 0

  for (const step of steps) {
    const actions = step.allowedActions
      .map((action) => buildAction(action))
      .filter(
        (action): action is Record<string, unknown> => action !== null,
      )

    const keyQuestion = step.activationRequirement || null

    console.log(
      `→ Step "${step.name}" (${step.id}): ${step.allowedActions.length} allowedActions → ${actions.length} actions`,
    )

    await prisma.agentStep.update({
      where: { id: step.id },
      data: {
        actions:
          actions.length > 0
            ? (actions as Prisma.InputJsonValue)
            : undefined,
        keyQuestion,
      },
    })

    migrated++
  }

  console.log(
    `\n✅ Migração concluída: ${migrated} migrados, ${skipped} ignorados`,
  )
  console.log(
    '\n⚠ Verifique steps com "[CONFIGURAR]" para preencher valores corretos (targetStage, title)',
  )
}

main()
  .catch((error) => {
    console.error('Erro na migração:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
