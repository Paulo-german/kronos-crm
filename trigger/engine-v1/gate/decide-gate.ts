import type { AgentSessionState, Observed } from '../ledger/schema'

// Requisitos de UMA etapa que o gate avalia. Na 1b.1 só o eixo `required` importa
// (polaridade POSITIVE_ONLY / natureza entram na 1b.2). `requiredKeys` = os fieldKeys
// obrigatórios da etapa (vazio = etapa sem portão → conversa livre, sempre "completa").
export interface StepRequirements {
  order: number
  requiredKeys: string[]
}

export interface GateDecision {
  nextStepOrder: number // onde o turno vai operar (persist grava isto)
  pendingRequired: string[] // required ainda não coletados da etapa final (generate cobra)
  advanced: boolean // avançou de etapa neste turno (telemetria)
}

// Um campo required está SATISFEITO quando o ledger tem um valor de fato informado.
// Na 1b.1: nature 'provided' + value não-vazio. Adiar/recusar/evadir NÃO satisfaz (fica
// pendente). A camada de polaridade (POSITIVE_ONLY → desvio) e de natureza vem na 1b.2.
function isSatisfied(observed: Observed | undefined): boolean {
  return observed?.nature === 'provided' && observed.value.trim().length > 0
}

function pendingOf(
  step: StepRequirements | undefined,
  attributes: AgentSessionState['attributes'],
): string[] {
  if (!step) return []
  return step.requiredKeys.filter((key) => !isSatisfied(attributes[key]))
}

// O GATE (Forma 1): decisão determinística de avanço — sem LLM, só `required ⊆ ledger`.
// Começa na etapa atual e avança enquanto ela estiver COMPLETA (todos os required
// satisfeitos) e houver próxima. Assim, se o lead despeja tudo de uma vez, o funil pula
// várias etapas até achar uma com pendência (ou parar na última). Etapa sem `required`
// conta como completa (portão aberto). Nunca retrocede nem pula um required.
export function decideGate(
  steps: StepRequirements[],
  attributes: AgentSessionState['attributes'],
  currentStepOrder: number,
): GateDecision {
  const byOrder = new Map(steps.map((step) => [step.order, step]))
  const lastOrder = steps.reduce(
    (max, step) => Math.max(max, step.order),
    currentStepOrder,
  )

  let order = currentStepOrder
  while (order < lastOrder) {
    const pending = pendingOf(byOrder.get(order), attributes)
    if (pending.length > 0) {
      return {
        nextStepOrder: order,
        pendingRequired: pending,
        advanced: order > currentStepOrder,
      }
    }
    order += 1 // etapa completa → tenta a próxima
  }

  // Chegou na última etapa (ou começou nela): reporta as pendências dela, sem mais avanço.
  return {
    nextStepOrder: order,
    pendingRequired: pendingOf(byOrder.get(order), attributes),
    advanced: order > currentStepOrder,
  }
}
