import 'server-only'
import { CustomerStatus, LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { revalidateLifecycleCache } from './revalidate-lifecycle-cache'
import { revalidateCopilotCache } from '@/_lib/revalidate-copilot-cache'

interface DowngradeContactIfDealReopenedParams {
  dealId: string
  contactId: string
  organizationId: string
  changedByUserId: string | null
}

export async function downgradeContactIfDealReopened(
  params: DowngradeContactIfDealReopenedParams,
): Promise<{ applied: boolean }> {
  const { dealId, contactId, organizationId, changedByUserId } = params

  // Busca a entrada do histórico que este deal causou
  const entry = await db.contactLifecycleHistory.findFirst({
    where: {
      contactId,
      causeType: LifecycleCauseType.DEAL_WON,
      causeRefId: dealId,
      toStage: LifecycleStage.CUSTOMER,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Este deal nunca promoveu o contato — nada a desfazer
  if (!entry) return { applied: false }

  // Verifica se outro deal WON posterior sustenta o estágio CUSTOMER
  const newerWon = await db.contactLifecycleHistory.findFirst({
    where: {
      contactId,
      causeType: LifecycleCauseType.DEAL_WON,
      toStage: LifecycleStage.CUSTOMER,
      createdAt: { gt: entry.createdAt },
      causeRefId: { not: dealId },
    },
  })

  // Outro deal mais recente sustenta o CUSTOMER — não regredir
  if (newerWon) return { applied: false }

  // Regressão: volta para o fromStage que estava gravado no histórico.
  // Fallback OPPORTUNITY: invariante seguro porque DEAL_WON só é emitido
  // a partir de OPPORTUNITY ou superior — nunca de LEAD/QUALIFIED.
  const targetStage = entry.fromStage ?? LifecycleStage.OPPORTUNITY

  await db.$transaction([
    db.contact.update({
      where: { id: contactId },
      data: {
        lifecycleStage: targetStage,
        // customerStatus é non-nullable no schema (default NEVER_BOUGHT). Como o
        // contato está saindo de CUSTOMER, voltamos ao estado pré-compra.
        customerStatus: CustomerStatus.NEVER_BOUGHT,
        becameCustomerAt: null,
      },
    }),
    db.contactLifecycleHistory.create({
      data: {
        contactId,
        organizationId,
        fromStage: LifecycleStage.CUSTOMER,
        toStage: targetStage,
        causeType: LifecycleCauseType.DEAL_REOPENED,
        causeRefId: dealId,
        changedByUserId: changedByUserId ?? null,
      },
    }),
  ])

  revalidateLifecycleCache(organizationId, contactId)
  revalidateCopilotCache(organizationId)

  return { applied: true }
}
