/**
 * Remove entradas search_knowledge do JSON actions de todos os AgentSteps.
 *
 * A tool passou a ser implícita (injetada automaticamente quando há KB ativa) —
 * não deve mais aparecer como step action configurada. Este script limpa dados
 * legados persistidos antes da limpeza da UI.
 *
 * Idempotente: steps sem search_knowledge não são tocados.
 * Rodar com: pnpm tsx scripts/cleanup-search-knowledge-step-actions.ts
 */

import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const steps = await prisma.agentStep.findMany({
    where: { actions: { not: Prisma.JsonNull } },
    select: { id: true, name: true, actions: true },
  })

  console.log(`\nInspecionando ${steps.length} steps...\n`)

  let cleaned = 0

  for (const step of steps) {
    if (!Array.isArray(step.actions)) continue

    const original = step.actions as Array<{ type?: string }>
    const filtered = original.filter((action) => action?.type !== 'search_knowledge')

    if (filtered.length === original.length) continue

    await prisma.agentStep.update({
      where: { id: step.id },
      data: { actions: filtered as Prisma.InputJsonValue },
    })

    cleaned++
    console.log(
      `→ "${step.name}" (${step.id}): ${original.length} actions → ${filtered.length} (removida search_knowledge)`,
    )
  }

  if (cleaned === 0) {
    console.log('Nenhum step com search_knowledge encontrado. Nada a limpar.')
    return
  }

  console.log(`\n✅ ${cleaned} step(s) limpos.`)
}

main()
  .catch((error) => {
    console.error('Erro na migração:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
