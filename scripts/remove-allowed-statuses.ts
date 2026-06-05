/**
 * Migração de dados: remove o campo `allowedStatuses` das tools `update_deal`
 * armazenadas em agentStep.actions e agent.globalTools.
 *
 * A capacidade do agente IA de marcar deals como WON/LOST foi removida —
 * passou a ser ação exclusivamente humana. Este script limpa os dados legados.
 *
 * IMPORTANTE: o JSON é manipulado CRU (sem safeParse pelos schemas Zod), pois
 * os schemas reinjetariam o campo via `.default([])`/coerções. Tratamos cada
 * item como `unknown` e fazemos cast manual.
 *
 * Idempotente: pula registros onde nenhum item ainda possui a chave.
 *
 * Rodar com: npx tsx scripts/remove-allowed-statuses.ts
 */

import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Remove a chave `allowedStatuses` de itens update_deal de um array JSON cru.
 * Retorna o array possivelmente alterado e se houve mudança.
 */
function stripAllowedStatuses(value: unknown): {
  cleaned: Record<string, unknown>[]
  changed: boolean
} {
  if (!Array.isArray(value)) {
    return { cleaned: [], changed: false }
  }

  let changed = false

  const cleaned = value.map((rawItem) => {
    if (typeof rawItem !== 'object' || rawItem === null) {
      return rawItem as Record<string, unknown>
    }

    const item = rawItem as Record<string, unknown>

    if (item.type === 'update_deal' && 'allowedStatuses' in item) {
      changed = true
      const { allowedStatuses: _removed, ...rest } = item
      return rest
    }

    return item
  })

  return { cleaned, changed }
}

async function migrateAgentSteps(): Promise<{ processed: number; updated: number }> {
  const steps = await prisma.agentStep.findMany({
    where: { actions: { not: Prisma.JsonNull } },
    select: { id: true, name: true, actions: true },
  })

  let updated = 0

  for (const step of steps) {
    const { cleaned, changed } = stripAllowedStatuses(step.actions)
    if (!changed) continue

    await prisma.agentStep.update({
      where: { id: step.id },
      data: { actions: cleaned as Prisma.InputJsonValue },
    })

    console.log(`  → AgentStep "${step.name}" (${step.id}) atualizado`)
    updated++
  }

  return { processed: steps.length, updated }
}

async function migrateAgentGlobalTools(): Promise<{ processed: number; updated: number }> {
  const agents = await prisma.agent.findMany({
    where: { globalTools: { not: Prisma.JsonNull } },
    select: { id: true, name: true, globalTools: true },
  })

  let updated = 0

  for (const agent of agents) {
    const { cleaned, changed } = stripAllowedStatuses(agent.globalTools)
    if (!changed) continue

    await prisma.agent.update({
      where: { id: agent.id },
      data: { globalTools: cleaned as Prisma.InputJsonValue },
    })

    console.log(`  → Agent "${agent.name}" (${agent.id}) globalTools atualizado`)
    updated++
  }

  return { processed: agents.length, updated }
}

async function main() {
  console.log('\n[agentStep.actions]')
  const stepResult = await migrateAgentSteps()
  console.log(
    `  Processados: ${stepResult.processed} | Alterados: ${stepResult.updated}`,
  )

  console.log('\n[agent.globalTools]')
  const globalResult = await migrateAgentGlobalTools()
  console.log(
    `  Processados: ${globalResult.processed} | Alterados: ${globalResult.updated}`,
  )

  console.log(
    `\n✅ Migração concluída: ${stepResult.updated + globalResult.updated} registro(s) alterado(s).`,
  )
}

main()
  .catch((error) => {
    console.error('Erro na migração:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
