import { logger } from '@trigger.dev/sdk/v3'
import { BATCH_SIZE } from './health-score-constants'
import { collectSignalsForOrg, toContactSignals } from './collect-health-signals'
import { computeHealthScore } from './compute-health-score'
import { persistBatch } from './persist-health-score'
import type { HealthScoreResult } from './health-score-types'

interface OrgScoringResult {
  scored: number
  errors: number
  durationMs: number
}

export async function scoreOrgInBatches(orgId: string): Promise<OrgScoringResult> {
  const startedAt = Date.now()
  let scored = 0
  let errors = 0

  const rows = await collectSignalsForOrg(orgId)

  if (rows.length === 0) {
    return { scored: 0, errors: 0, durationMs: Date.now() - startedAt }
  }

  const results: HealthScoreResult[] = []

  for (const row of rows) {
    try {
      results.push(
        computeHealthScore({
          contactId: row.contactId,
          organizationId: orgId,
          stage: row.lifecycleStage,
          signals: toContactSignals(row),
        }),
      )
    } catch (itemError) {
      logger.error('health-score-cron:compute_failed', {
        organizationId: orgId,
        contactId: row.contactId,
        error: itemError instanceof Error ? itemError.message : String(itemError),
      })
      errors += 1
    }
  }

  for (let offset = 0; offset < results.length; offset += BATCH_SIZE) {
    const chunk = results.slice(offset, offset + BATCH_SIZE)
    try {
      await persistBatch(chunk)
      scored += chunk.length
    } catch (batchError) {
      logger.error('health-score-cron:batch_failed', {
        organizationId: orgId,
        batchStart: offset,
        batchSize: chunk.length,
        error: batchError instanceof Error ? batchError.message : String(batchError),
      })
      errors += chunk.length
    }
  }

  return { scored, errors, durationMs: Date.now() - startedAt }
}
