import 'server-only'

import type { Prisma } from '@prisma/client'
import { SIMULATOR_CONTACT_PHONE } from '@/_lib/simulator'

interface BuildContactWhereOptions {
  /** Filtro adicional de lifecycleStage — ex: { in: ['LEAD', 'QUALIFIED'] } ou 'CUSTOMER'. */
  lifecycleStage?: Prisma.ContactWhereInput['lifecycleStage']
}

/**
 * Constrói o WHERE base usado pelas queries do dashboard v2 que partem do model `Contact`.
 *
 * Análogo ao `buildDashboardWhere` do v1, porém:
 * - Aplica-se ao model `Contact` (não `Deal`) — shape de exclusão de simulador é diferente.
 * - RBAC: MEMBER fica restrito ao seu próprio escopo via `assignedTo = userId`.
 * - Aceita filtro adicional de `lifecycleStage` para queries específicas dos cards
 *   de Atenção (que rodam só sobre um estágio).
 */
export function buildContactWhereForDashboardV2(
  orgId: string,
  userId: string,
  elevated: boolean,
  options?: BuildContactWhereOptions,
): Prisma.ContactWhereInput {
  return {
    organizationId: orgId,
    // Exclui o contato simulado (mesmo padrão do v1)
    phone: { not: SIMULATOR_CONTACT_PHONE },
    // RBAC: MEMBER só vê seus próprios contatos; OWNER/ADMIN veem toda a org
    ...(elevated ? {} : { assignedTo: userId }),
    ...(options?.lifecycleStage ? { lifecycleStage: options.lifecycleStage } : {}),
  }
}
