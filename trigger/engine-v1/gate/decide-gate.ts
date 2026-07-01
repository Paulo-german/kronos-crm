import type { AgentSessionState, Observed } from '../ledger/schema'

// Requisitos de UMA etapa que o gate avalia. `id` = ponteiro estável (imune a reordenação);
// `order` só define a SEQUÊNCIA; `requiredKeys` = fieldKeys obrigatórios (vazio = etapa sem
// portão de dados → etapa de aviso/conversa livre). Na 1b só o eixo `required` importa.
export interface StepRequirements {
  id: string
  order: number
  requiredKeys: string[]
}

// Estado da sessão que o gate consulta. `currentStepId` é o ponteiro por ID (null = sessão
// nova → resolve pra primeira etapa). `stepEnteredAtTurn` é o `turnCount` de quando entrou na
// etapa atual — usado pra exigir que uma etapa SEM required rode ≥1 turno antes de avançar.
export interface GateSessionState {
  currentStepId: string | null
  turnCount: number
  stepEnteredAtTurn: number
}

// Janela do `await`: por quantos turnos o gate respeita um adiamento antes de reconduzir.
// W=1 = respeita SÓ o turno do adiamento; no seguinte volta a puxar (probe). Curto de
// propósito: se o campo é required, um await longo TRAVARIA o funil pra sempre. O corte da
// insistência (adiamento crônico → escala) é por CONTAGEM de adiamentos, não aqui (2.c).
const AWAIT_TURN_WINDOW = 1

// Postura de cobrança de um campo pendente — deriva da NATUREZA da última resposta (no
// ledger). É o que faz o gate "conversar": adiar não é recusar. `probe` = trazer à tona /
// puxar de volta (campo novo ou evadido); `await` = adiado há ≤1 turno, respeita e retoma na
// brecha; `reinforce` = recusado, reforça com jeito. (O corte da recusa firme → handoff = 2.c.)
export type Posture = 'probe' | 'await' | 'reinforce'

export interface PendingField {
  key: string
  posture: Posture
}

export interface GateDecision {
  nextStepId: string | null // etapa onde o turno opera (persist grava); null = sem funil
  pendingRequired: PendingField[] // required não coletados da etapa final (generate cobra)
  advanced: boolean // mudou de etapa neste turno (persist reinicia o contador de turno)
}

// Um campo required está SATISFEITO quando o ledger tem um valor de fato informado.
// Na 1b: nature 'provided' + value não-vazio. Adiar/recusar/evadir NÃO satisfaz (fica
// pendente com a postura correspondente). A polaridade (POSITIVE_ONLY → desvio) vem na 2.b.
function isSatisfied(observed: Observed | undefined): boolean {
  return observed?.nature === 'provided' && observed.value.trim().length > 0
}

// Traduz a natureza da resposta em postura. O `deferred` só vira `await` DENTRO da janela
// (senão reconduz como probe — não trava o required). Default `probe` cobre o campo ainda
// não perguntado, o evadido e o edge provided-vazio — todos "traga à tona".
function postureFor(
  observed: Observed | undefined,
  turnCount: number,
): Posture {
  if (observed?.nature === 'deferred') {
    const turnsSince = turnCount - observed.observedAtTurn
    return turnsSince < AWAIT_TURN_WINDOW ? 'await' : 'probe'
  }
  if (observed?.nature === 'refused') return 'reinforce'
  return 'probe'
}

function pendingOf(
  step: StepRequirements,
  attributes: AgentSessionState['attributes'],
  turnCount: number,
): PendingField[] {
  return step.requiredKeys
    .filter((key) => !isSatisfied(attributes[key]))
    .map((key) => ({ key, posture: postureFor(attributes[key], turnCount) }))
}

// O GATE (Forma 1): decisão determinística de avanço — sem LLM, só `required ⊆ ledger`.
// Percorre a LISTA REAL ordenada (não índice numérico → imune a buraco de order). Resolve a
// etapa atual PELO ID; se o ID é null (sessão nova) ou não existe mais (etapa deletada), cai
// na primeira e o ledger reconstrói a posição (pula o já satisfeito). Avança enquanto a etapa
// estiver COMPLETA; etapa SEM required (aviso) roda ≥1 turno antes de avançar.
export function decideGate(
  steps: StepRequirements[],
  attributes: AgentSessionState['attributes'],
  session: GateSessionState,
): GateDecision {
  const { currentStepId, turnCount, stepEnteredAtTurn } = session
  const ordered = [...steps].sort((first, second) => first.order - second.order)
  if (ordered.length === 0) {
    return { nextStepId: currentStepId, pendingRequired: [], advanced: false }
  }

  // Etapa atual por ID; fallback pra primeira (índice 0) se null/inexistente.
  const startIdx = Math.max(
    0,
    ordered.findIndex((step) => step.id === currentStepId),
  )

  const decisionAt = (
    step: StepRequirements,
    pending: PendingField[],
  ): GateDecision => ({
    nextStepId: step.id,
    pendingRequired: pending,
    advanced: step.id !== currentStepId,
  })

  for (let idx = startIdx; idx < ordered.length; idx++) {
    const step = ordered[idx]
    const pending = pendingOf(step, attributes, turnCount)
    if (pending.length > 0) return decisionAt(step, pending) // required pendente → cobra

    // Etapa completa. Se NÃO tem required, é etapa de aviso: precisa rodar ≥1 turno. Só a
    // etapa de partida (idx === startIdx) pode já ter cumprido esse turno; uma alcançada
    // por avanço neste turno ainda não → para nela.
    if (step.requiredKeys.length === 0) {
      const ranAtLeastOneTurn =
        idx === startIdx && turnCount > stepEnteredAtTurn
      if (!ranAtLeastOneTurn) return decisionAt(step, [])
    }
  }

  // Todas as etapas cumpridas: fica na última.
  return decisionAt(ordered[ordered.length - 1], [])
}
