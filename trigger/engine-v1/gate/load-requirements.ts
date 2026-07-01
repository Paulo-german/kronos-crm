import { db } from '@/_lib/prisma'
import type { StepRequirements } from './decide-gate'

// Carrega o contrato de qualificação do agente: por etapa, os fieldKeys obrigatórios.
// Na 1b.1 só `source: AGENT` (os que o extrator popula no ledger). CUSTOM_FIELD (FieldDefinition
// do CRM) entra na 1c, junto com o sync — antes disso um required CUSTOM_FIELD travaria o funil
// pra sempre (o ledger ainda não tem essas keys). Retorna TODOS os steps (mesmo sem required),
// pra o gate conhecer o range de etapas e poder avançar por etapas sem portão.
export async function loadStepRequirements(
  agentId: string,
): Promise<StepRequirements[]> {
  const steps = await db.agentEngineStep.findMany({
    where: { agentId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      fields: {
        where: { source: 'AGENT', required: true },
        orderBy: { position: 'asc' }, // preserva a ordem do dono (o gate cobra 1 por vez)
        select: { agentFieldKey: true },
      },
    },
  })

  return steps.map((step) => ({
    id: step.id,
    order: step.order,
    requiredKeys: step.fields
      .map((field) => field.agentFieldKey)
      .filter((key): key is string => Boolean(key)),
  }))
}
