import { schedules, logger, metadata as triggerMetadata } from '@trigger.dev/sdk/v3'
import { CustomerStatus, LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { revalidateContactsCache } from './lib/revalidate-cache'

const BATCH_SIZE = 100

export const dormantCustomersCron = schedules.task({
  id: 'dormant-customers-cron',
  cron: '0 3 * * *',
  retry: { maxAttempts: 2 },
  run: async () => {
    const orgs = await db.organization.findMany({
      where: { dormantAfterMonths: { gt: 0 } },
      select: { id: true, dormantAfterMonths: true },
    })

    triggerMetadata.set('totalOrgs', orgs.length)
    logger.info('dormant-cron:start', { totalOrgs: orgs.length })

    let totalProcessed = 0
    let totalErrors = 0

    for (const org of orgs) {
      const dormantThreshold = new Date()
      dormantThreshold.setMonth(dormantThreshold.getMonth() - org.dormantAfterMonths)

      // Busca contatos CUSTOMER + ACTIVE cujo último Deal WON é anterior ao threshold.
      // Raw SQL necessário para o GROUP BY + HAVING com aggregate por contato.
      const candidates = await db.$queryRaw<Array<{ contactId: string; lastWonAt: Date }>>`
        SELECT dc.contact_id AS "contactId", MAX(d.updated_at) AS "lastWonAt"
        FROM contacts c
        JOIN deal_contacts dc ON dc.contact_id = c.id
        JOIN deals d ON d.id = dc.deal_id
        WHERE c.organization_id = ${org.id}
          AND c.lifecycle_stage = 'CUSTOMER'
          AND c.customer_status = 'ACTIVE'
          AND d.status = 'WON'
        GROUP BY dc.contact_id
        HAVING MAX(d.updated_at) < ${dormantThreshold}
        LIMIT ${BATCH_SIZE}
      `

      // Camada 2: filtra candidatos protegidos por assinatura recorrente ativa.
      // RECURRING_OPEN = sem prazo, nunca cancela; RECURRING_CONTRACT = contrato ainda vigente.
      // Feito via Prisma (regra de negócio) — SQL acima só cuida da aggregation temporal.
      const activeRecurringItems = await db.dealLineItem.findMany({
        where: {
          cancelledAt: null,
          OR: [
            { recurrenceType: 'RECURRING_OPEN' },
            { recurrenceType: 'RECURRING_CONTRACT', contractEndDate: { gt: new Date() } },
          ],
          deal: {
            status: 'WON',
            contacts: { some: { contactId: { in: candidates.map((c) => c.contactId) } } },
          },
        },
        select: {
          deal: {
            select: {
              contacts: {
                where: { contactId: { in: candidates.map((c) => c.contactId) } },
                select: { contactId: true },
              },
            },
          },
        },
      })

      const protectedIds = new Set(
        activeRecurringItems.flatMap((item) => item.deal.contacts.map((c) => c.contactId)),
      )

      const eligibleCandidates = candidates.filter((c) => !protectedIds.has(c.contactId))

      let processed = 0
      let errors = 0

      for (const candidate of eligibleCandidates) {
        try {
          const wasUpdated = await db.$transaction(async (tx) => {
            // Re-check dentro da tx: contato pode ter sido re-ativado por deal WON concorrente
            const fresh = await tx.contact.findUnique({
              where: { id: candidate.contactId },
              select: { customerStatus: true },
            })

            if (fresh?.customerStatus !== CustomerStatus.ACTIVE) return false

            // Confirma que não surgiu um Deal WON recente após a leitura do batch
            const recentWon = await tx.deal.findFirst({
              where: {
                status: 'WON',
                updatedAt: { gte: dormantThreshold },
                contacts: { some: { contactId: candidate.contactId } },
              },
              select: { id: true },
            })
            if (recentWon) return false

            // Camada 3: guard de race condition — um item recorrente pode ter sido criado
            // entre a leitura do batch e esta transação (ex: booking cria deal + line item)
            const activeRecurring = await tx.dealLineItem.findFirst({
              where: {
                cancelledAt: null,
                OR: [
                  { recurrenceType: 'RECURRING_OPEN' },
                  { recurrenceType: 'RECURRING_CONTRACT', contractEndDate: { gt: new Date() } },
                ],
                deal: {
                  status: 'WON',
                  contacts: { some: { contactId: candidate.contactId } },
                },
              },
              select: { id: true },
            })
            if (activeRecurring) return false

            await tx.contact.update({
              where: { id: candidate.contactId },
              data: { customerStatus: CustomerStatus.DORMANT },
            })

            await tx.contactLifecycleHistory.create({
              data: {
                contactId: candidate.contactId,
                organizationId: org.id,
                fromStage: LifecycleStage.CUSTOMER,
                toStage: LifecycleStage.CUSTOMER,
                causeType: LifecycleCauseType.INACTIVITY,
                causeRefId: null,
              },
            })

            return true
          })

          if (wasUpdated) processed++
        } catch (itemError) {
          logger.error('dormant-cron:item_failed', {
            organizationId: org.id,
            contactId: candidate.contactId,
            error: itemError instanceof Error ? itemError.message : String(itemError),
          })
          errors++
        }
      }

      if (processed > 0) {
        await revalidateContactsCache(org.id)
      }

      logger.info('dormant-cron:org_done', {
        organizationId: org.id,
        candidates: candidates.length,
        skippedRecurring: candidates.length - eligibleCandidates.length,
        processed,
        errors,
      })

      totalProcessed += processed
      totalErrors += errors
    }

    triggerMetadata.set('totalProcessed', totalProcessed)
    triggerMetadata.set('totalErrors', totalErrors)

    logger.info('dormant-cron:done', { totalOrgs: orgs.length, totalProcessed, totalErrors })

    return { totalOrgs: orgs.length, totalProcessed, totalErrors }
  },
})
