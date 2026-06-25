import 'server-only'

import { CustomerStatus, LifecycleStage } from '@prisma/client'
import { db } from '@/_lib/prisma'

/**
 * Zera todo o estado de lifecycle/score/captura do contato simulado,
 * devolvendo-o ao estado de "lead novo".
 *
 * Necessário porque o contato do simulador é reutilizado (singleton por
 * telefone) e `advanceContactLifecycle` só avança, nunca regride. Sem reset,
 * triggers de lifecycle (ex: criação de deal ao chegar em OPPORTUNITY) nunca
 * voltariam a disparar em simulações repetidas.
 */
export async function resetSimulatorContactState(
  contactId: string,
  organizationId: string,
): Promise<void> {
  await db.$transaction([
    db.contactLifecycleHistory.deleteMany({
      where: { contactId, organizationId },
    }),
    db.contactScoreHistory.deleteMany({ where: { contactId, organizationId } }),
    db.captureEvent.deleteMany({ where: { contactId, organizationId } }),
    db.contact.update({
      where: { id: contactId },
      data: {
        lifecycleStage: LifecycleStage.LEAD,
        customerStatus: CustomerStatus.NEVER_BOUGHT,
        qualifiedAt: null,
        becameOpportunityAt: null,
        becameCustomerAt: null,
        healthScore: null,
        scoredAt: null,
        lastInteractionAt: null,
        firstCaptureChannel: null,
        firstCaptureAt: null,
        lastCaptureChannel: null,
        lastCaptureAt: null,
      },
    }),
  ])
}

/**
 * O agente cria a negociação automaticamente via lifecycle quando algum step
 * dispara o trigger de OPPORTUNITY (único estágio que cria deal em
 * `applyLifecycleTrigger`). Nesses casos o simulador NÃO deve criar o deal na
 * largada — o deal nasce pelo lifecycle, como em produção.
 */
export function agentCreatesDealViaLifecycle(
  steps: Array<{ lifecycleTrigger: LifecycleStage | null }>,
): boolean {
  return steps.some(
    (step) => step.lifecycleTrigger === LifecycleStage.OPPORTUNITY,
  )
}
