/**
 * Backfill: preenche fromStatus/toStatus nas entradas de ContactLifecycleHistory
 * que foram gravadas como CUSTOMER→CUSTOMER (antes dos campos existirem).
 *
 * Regras:
 *   causeType == INACTIVITY  → fromStatus: ACTIVE,  toStatus: DORMANT
 *   causeType == DEAL_WON    → fromStatus: DORMANT, toStatus: ACTIVE  (reativação)
 *
 * Filtra apenas linhas onde fromStage == CUSTOMER e toStage == CUSTOMER
 * para não tocar promoções de estágio legítimas que também usam DEAL_WON.
 *
 * Idempotente: pula linhas que já têm toStatus preenchido.
 *
 * Uso: pnpm tsx scripts/backfill-lifecycle-status.ts
 */

import {
  PrismaClient,
  CustomerStatus,
  LifecycleCauseType,
  LifecycleStage,
} from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const candidates = await db.contactLifecycleHistory.findMany({
    where: {
      fromStage: LifecycleStage.CUSTOMER,
      toStage: LifecycleStage.CUSTOMER,
      toStatus: null,
      causeType: {
        in: [LifecycleCauseType.INACTIVITY, LifecycleCauseType.DEAL_WON],
      },
    },
    select: { id: true, causeType: true },
  })

  const inactivityIds = candidates
    .filter((entry) => entry.causeType === LifecycleCauseType.INACTIVITY)
    .map((entry) => entry.id)

  const dealWonIds = candidates
    .filter((entry) => entry.causeType === LifecycleCauseType.DEAL_WON)
    .map((entry) => entry.id)

  console.warn(`  INACTIVITY (ACTIVE→DORMANT): ${inactivityIds.length} linhas`)
  console.warn(`  DEAL_WON   (DORMANT→ACTIVE): ${dealWonIds.length} linhas`)

  const [inactivityResult, dealWonResult] = await Promise.all([
    db.contactLifecycleHistory.updateMany({
      where: { id: { in: inactivityIds } },
      data: {
        fromStage: LifecycleStage.CUSTOMER,
        fromStatus: CustomerStatus.ACTIVE,
        toStatus: CustomerStatus.DORMANT,
      },
    }),
    db.contactLifecycleHistory.updateMany({
      where: { id: { in: dealWonIds } },
      data: {
        fromStage: LifecycleStage.CUSTOMER,
        fromStatus: CustomerStatus.DORMANT,
        toStatus: CustomerStatus.ACTIVE,
      },
    }),
  ])

  const updated = inactivityResult.count + dealWonResult.count
  console.warn(`Backfill concluído: ${updated} atualizadas.`)
}

main()
  .catch((error) => {
    console.error('Erro no backfill:', error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
