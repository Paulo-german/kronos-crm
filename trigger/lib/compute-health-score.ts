import type { LifecycleStage } from '@prisma/client'
import { STAGE_WEIGHTS, NORMALIZATION } from './health-score-constants'
import type {
  ContactSignals,
  ScoreComponents,
  ScoreWeights,
  HealthScoreResult,
} from './health-score-types'

interface ComputeInput {
  contactId: string
  organizationId: string
  stage: LifecycleStage
  signals: ContactSignals
}

// Normalização linear: 0 dias → 100, failingDays+ → 0
function normalizeLinear(value: number | null, failingDays: number): number {
  if (value === null) return 0
  if (value >= failingDays) return 0
  return Math.round(100 - (value / failingDays) * 100)
}

// LTV em escala log: R$ 10k+ satura em 100
const LTV_SATURATION_BRL = 10_000

function normalizeLtv(ltvBrl: number): number {
  if (ltvBrl <= 0) return 0
  if (ltvBrl >= LTV_SATURATION_BRL) return 100
  return Math.round((Math.log10(ltvBrl + 1) / Math.log10(LTV_SATURATION_BRL + 1)) * 100)
}

// Escala discreta para frequência de recompra nos últimos 12 meses
const REPURCHASE_SCORE_SINGLE = 60
const REPURCHASE_SCORE_DOUBLE = 80
const REPURCHASE_SCORE_FULL = 100

function normalizeRepurchaseFreq(count: number): number {
  if (count === 0) return 0
  if (count === 1) return REPURCHASE_SCORE_SINGLE
  if (count === 2) return REPURCHASE_SCORE_DOUBLE
  return REPURCHASE_SCORE_FULL
}

// Engajamento com IA: 5+ eventos em 30 dias satura em 100
const AGENT_ENGAGEMENT_SATURATION_EVENTS = 5

function normalizeAgentEngagement(events30d: number): number {
  return Math.min(
    100,
    Math.round((events30d / AGENT_ENGAGEMENT_SATURATION_EVENTS) * 100),
  )
}

const DRIVER_LABEL: Record<keyof ScoreComponents, (signals: ContactSignals) => string> = {
  recency: (s) => `Sem interação há ${s.daysSinceLastInteraction ?? '∞'} dias`,
  dealActivity: (s) => `Negociação parada há ${s.daysSinceLastDealActivity ?? '∞'} dias`,
  daysSinceLastPurchase: (s) => `Sem compra há ${s.daysSinceLastPurchase ?? '∞'} dias`,
  repurchaseFrequency: (s) => `Apenas ${s.repurchaseCount12m} compra(s) nos últimos 12 meses`,
  ltv: (s) => `LTV baixo (R$ ${s.ltvBrl.toFixed(2)})`,
  agentEngagement: (s) =>
    `Sem engajamento com IA (${s.agentEngagementEventsLast30d} eventos em 30d)`,
}

// Componentes com sinal nulo não devem ser apontados como main driver —
// o dado não existe ainda, não é uma falha mensurável do contato.
function hasNullSignal(key: keyof ScoreComponents, signals: ContactSignals): boolean {
  if (key === 'recency') return signals.daysSinceLastInteraction === null
  if (key === 'dealActivity') return signals.daysSinceLastDealActivity === null
  if (key === 'daysSinceLastPurchase') return signals.daysSinceLastPurchase === null
  return false
}

// O "main driver" é a componente que mais arrasta o score pra baixo (peso × gap até 100)
function computeMainDriver(
  components: ScoreComponents,
  weights: ScoreWeights,
  signals: ContactSignals,
): { mainDriver: string; mainDriverKey: keyof ScoreComponents } {
  const candidates = (Object.keys(components) as Array<keyof ScoreComponents>)
    .filter((key) => weights[key] > 0 && !hasNullSignal(key, signals))
    .map((key) => ({ key, negative: weights[key] * (100 - components[key]) }))
    .sort((a, b) => b.negative - a.negative)

  // ltv tem peso > 0 em todos os estágios e nunca tem sinal nulo — candidates nunca é vazio.
  const top = candidates[0]
  return { mainDriverKey: top.key, mainDriver: DRIVER_LABEL[top.key](signals) }
}

export function computeHealthScore(input: ComputeInput): HealthScoreResult {
  const weights = STAGE_WEIGHTS[input.stage]
  const { signals } = input

  const components: ScoreComponents = {
    recency: normalizeLinear(signals.daysSinceLastInteraction, NORMALIZATION.recency.failingDays),
    dealActivity: normalizeLinear(
      signals.daysSinceLastDealActivity,
      NORMALIZATION.dealActivity.failingDays,
    ),
    repurchaseFrequency: normalizeRepurchaseFreq(signals.repurchaseCount12m),
    daysSinceLastPurchase: normalizeLinear(
      signals.daysSinceLastPurchase,
      NORMALIZATION.daysSinceLastPurchase.failingDays,
    ),
    ltv: normalizeLtv(signals.ltvBrl),
    agentEngagement: normalizeAgentEngagement(signals.agentEngagementEventsLast30d),
  }

  const rawScore =
    components.recency * weights.recency +
    components.dealActivity * weights.dealActivity +
    components.repurchaseFrequency * weights.repurchaseFrequency +
    components.daysSinceLastPurchase * weights.daysSinceLastPurchase +
    components.ltv * weights.ltv +
    components.agentEngagement * weights.agentEngagement

  const score = Math.round(Math.max(0, Math.min(100, rawScore)))
  const { mainDriver, mainDriverKey } = computeMainDriver(components, weights, signals)

  return {
    contactId: input.contactId,
    organizationId: input.organizationId,
    score,
    snapshot: {
      stage: input.stage,
      components,
      weights,
      mainDriver,
      mainDriverKey,
      rawSignals: signals,
    },
  }
}
