import { schedules, logger, metadata as triggerMetadata } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { SCORE_ELIGIBLE_PRODUCT_KEYS } from './lib/health-score-constants'
import { scoreOrgInBatches } from './lib/score-org-in-batches'
import { revalidateCopilotCache } from './lib/revalidate-cache'

// feat copilot desativada temporariamente — restaurar cron para reativar
export const healthScoreCron = schedules.task({
  id: 'health-score-cron',
  cron: '0 4 31 2 *', // data impossível (31 fev) — desativado sem remover o job
  retry: { maxAttempts: 2 },
  run: async () => {
    const orgs = await db.organization.findMany({
      where: {
        contacts: { some: {} },
        subscriptions: {
          some: {
            status: 'active',
            plan: {
              slug: { in: [...SCORE_ELIGIBLE_PRODUCT_KEYS] },
            },
          },
        },
      },
      select: { id: true },
    })

    triggerMetadata.set('totalOrgs', orgs.length)
    logger.info('health-score-cron:start', { totalOrgs: orgs.length })

    let totalScored = 0
    let totalErrors = 0

    for (const org of orgs) {
      const result = await scoreOrgInBatches(org.id)
      totalScored += result.scored
      totalErrors += result.errors

      if (result.scored > 0) {
        await revalidateCopilotCache(org.id)
      }

      logger.info('health-score-cron:org_done', {
        organizationId: org.id,
        scored: result.scored,
        errors: result.errors,
        durationMs: result.durationMs,
      })
    }

    triggerMetadata.set('totalScored', totalScored)
    triggerMetadata.set('totalErrors', totalErrors)

    logger.info('health-score-cron:done', { totalOrgs: orgs.length, totalScored, totalErrors })

    return { totalOrgs: orgs.length, totalScored, totalErrors }
  },
})
