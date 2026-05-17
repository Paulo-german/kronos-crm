import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import type { HealthScoreResult } from './health-score-types'

const MAX_CONCURRENT_UPDATES = 10

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<void> {
  let index = 0

  async function runNext(): Promise<void> {
    if (index >= tasks.length) return
    const current = tasks[index++]
    await current()
    await runNext()
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, runNext))
}

// Batch: usado pelo cron — createMany para histórico + updates paralelos limitados
export async function persistBatch(results: HealthScoreResult[]): Promise<void> {
  if (results.length === 0) return

  const now = new Date()

  await db.contactScoreHistory.createMany({
    data: results.map((result) => ({
      contactId: result.contactId,
      organizationId: result.organizationId,
      score: result.score,
      snapshot: result.snapshot as unknown as Prisma.InputJsonValue,
      createdAt: now,
    })),
  })

  const updates = results.map(
    (result) => () =>
      db.contact.update({
        where: { id: result.contactId },
        data: { healthScore: result.score, scoredAt: now },
      }),
  )

  await runWithConcurrency(updates, MAX_CONCURRENT_UPDATES)
}

// Single: usado pelo after() das actions — transação atômica
export async function persistOne(result: HealthScoreResult): Promise<void> {
  const now = new Date()
  await db.$transaction([
    db.contact.update({
      where: { id: result.contactId },
      data: { healthScore: result.score, scoredAt: now },
    }),
    db.contactScoreHistory.create({
      data: {
        contactId: result.contactId,
        organizationId: result.organizationId,
        score: result.score,
        snapshot: result.snapshot as unknown as Prisma.InputJsonValue,
        createdAt: now,
      },
    }),
  ])
}
