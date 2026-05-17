/**
 * Teste unitário de computeHealthScore.
 *
 * COMO RODAR:
 *   pnpm tsx trigger/lib/__tests__/compute-health-score.test.ts
 *
 * Sem banco, sem env vars — usa fixtures sintéticos de ContactSignals.
 *
 * COBERTURA:
 *   - Todos os 4 lifecycleStages (LEAD, QUALIFIED, OPPORTUNITY, CUSTOMER)
 *   - Score alto e baixo por estágio
 *   - Main driver correto por cenário
 *   - Sinais null não são apontados como main driver
 *   - Score sempre dentro de 0–100
 *   - Saturação de agentEngagement em 5 eventos
 */

import { computeHealthScore } from '../compute-health-score'
import type { ContactSignals } from '../health-score-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0
let failed = 0

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passed++
  } else {
    console.error(`  ✗ ${message}`)
    failed++
  }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  assert(
    actual === expected,
    `${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  )
}

function assertRange(value: number, min: number, max: number, message: string): void {
  assert(
    value >= min && value <= max,
    `${message} — got ${value}, expected in [${min}, ${max}]`,
  )
}

function section(title: string): void {
  console.log(`\n${title}`)
}

const CONTACT_ID = 'test-contact-id'
const ORG_ID = 'test-org-id'

// Sinais que saturam todos os componentes no máximo
const FRESH_SIGNALS: ContactSignals = {
  daysSinceLastInteraction: 0,
  daysSinceLastDealActivity: 0,
  daysSinceLastPurchase: 0,
  repurchaseCount12m: 3,
  ltvBrl: 10_000,
  agentEngagementEventsLast30d: 5,
}

// Sinais que zeram todos os componentes
const STALE_SIGNALS: ContactSignals = {
  daysSinceLastInteraction: 90,
  daysSinceLastDealActivity: 30,
  daysSinceLastPurchase: 180,
  repurchaseCount12m: 0,
  ltvBrl: 0,
  agentEngagementEventsLast30d: 0,
}

// Sinais com todos os campos temporais nulos
const NULL_SIGNALS: ContactSignals = {
  daysSinceLastInteraction: null,
  daysSinceLastDealActivity: null,
  daysSinceLastPurchase: null,
  repurchaseCount12m: 0,
  ltvBrl: 0,
  agentEngagementEventsLast30d: 0,
}

// ---------------------------------------------------------------------------
// LEAD (recency=0.5, ltv=0.1, agentEngagement=0.4)
// ---------------------------------------------------------------------------

section('LEAD — sinais frescos → score máximo')
{
  const result = computeHealthScore({
    contactId: CONTACT_ID,
    organizationId: ORG_ID,
    stage: 'LEAD',
    signals: FRESH_SIGNALS,
  })
  // recency=100*0.5 + ltv=100*0.1 + agentEngagement=100*0.4 = 100
  assertEq(result.score, 100, 'score = 100 com todos os sinais no máximo')
  assertEq(result.snapshot.stage, 'LEAD', 'stage preservado no snapshot')
  assertEq(result.snapshot.weights.dealActivity, 0, 'peso dealActivity = 0 em LEAD')
  assertEq(result.snapshot.weights.repurchaseFrequency, 0, 'peso repurchaseFrequency = 0 em LEAD')
  assertEq(result.snapshot.weights.daysSinceLastPurchase, 0, 'peso daysSinceLastPurchase = 0 em LEAD')
}

section('LEAD — sinais velhos → score mínimo, main driver = recency')
{
  const result = computeHealthScore({
    contactId: CONTACT_ID,
    organizationId: ORG_ID,
    stage: 'LEAD',
    signals: STALE_SIGNALS,
  })
  // recency=0*0.5 + ltv=0*0.1 + agentEngagement=0*0.4 = 0
  assertEq(result.score, 0, 'score = 0 com todos os sinais no mínimo')
  // main driver: recency neg=0.5*100=50, ltv neg=0.1*100=10, agentEngagement neg=0.4*100=40 → recency vence
  assertEq(result.snapshot.mainDriverKey, 'recency', 'main driver = recency (maior contribuição negativa)')
}

// ---------------------------------------------------------------------------
// QUALIFIED (mesmos pesos que LEAD)
// ---------------------------------------------------------------------------

section('QUALIFIED — pesos idênticos ao LEAD, scores iguais')
{
  const resultLead = computeHealthScore({
    contactId: CONTACT_ID,
    organizationId: ORG_ID,
    stage: 'LEAD',
    signals: FRESH_SIGNALS,
  })
  const resultQualified = computeHealthScore({
    contactId: CONTACT_ID,
    organizationId: ORG_ID,
    stage: 'QUALIFIED',
    signals: FRESH_SIGNALS,
  })
  assertEq(resultQualified.score, resultLead.score, 'score QUALIFIED = score LEAD (mesmos pesos)')
  assertEq(resultQualified.snapshot.stage, 'QUALIFIED', 'stage preservado no snapshot')
}

// ---------------------------------------------------------------------------
// OPPORTUNITY (recency=0.3, dealActivity=0.4, ltv=0.1, agentEngagement=0.2)
// ---------------------------------------------------------------------------

section('OPPORTUNITY — deal estagnado → dealActivity = 0, main driver = dealActivity')
{
  const staleDeal: ContactSignals = {
    daysSinceLastInteraction: 5,   // recency = round(100 - 5/90*100) = 94
    daysSinceLastDealActivity: 30, // dealActivity = 0 (30 >= failingDays=30)
    daysSinceLastPurchase: null,
    repurchaseCount12m: 0,
    ltvBrl: 0,
    agentEngagementEventsLast30d: 0,
  }
  const result = computeHealthScore({
    contactId: CONTACT_ID,
    organizationId: ORG_ID,
    stage: 'OPPORTUNITY',
    signals: staleDeal,
  })
  // recency=94*0.3=28.2, dealActivity=0*0.4=0, ltv=0*0.1=0, agentEngagement=0*0.2=0 → score≈28
  assertEq(result.snapshot.components.dealActivity, 0, 'dealActivity = 0 com 30 dias sem movimentação')
  assertEq(result.snapshot.mainDriverKey, 'dealActivity', 'main driver = dealActivity')
  assertRange(result.score, 20, 35, 'score baixo/médio com deal parado')
}

section('OPPORTUNITY — deal ativo e interação recente → score alto')
{
  const activeDeal: ContactSignals = {
    daysSinceLastInteraction: 0,
    daysSinceLastDealActivity: 0,
    daysSinceLastPurchase: null,
    repurchaseCount12m: 0,
    ltvBrl: 8_000,
    agentEngagementEventsLast30d: 4,
  }
  const result = computeHealthScore({
    contactId: CONTACT_ID,
    organizationId: ORG_ID,
    stage: 'OPPORTUNITY',
    signals: activeDeal,
  })
  // recency=100*0.3=30, dealActivity=100*0.4=40, ltv≈97*0.1≈9.7, agentEngagement=80*0.2=16 → score≈96
  assertRange(result.score, 90, 100, 'score alto com deal ativo e interação recente')
}

// ---------------------------------------------------------------------------
// CUSTOMER (recency=0.2, repurchaseFrequency=0.35, daysSinceLastPurchase=0.25, ltv=0.15, agentEngagement=0.05)
// ---------------------------------------------------------------------------

section('CUSTOMER — cliente fiel → score alto')
{
  const loyalCustomer: ContactSignals = {
    daysSinceLastInteraction: 10,
    daysSinceLastDealActivity: null,
    daysSinceLastPurchase: 30,
    repurchaseCount12m: 3,
    ltvBrl: 5_000,
    agentEngagementEventsLast30d: 2,
  }
  const result = computeHealthScore({
    contactId: CONTACT_ID,
    organizationId: ORG_ID,
    stage: 'CUSTOMER',
    signals: loyalCustomer,
  })
  // recency≈89*0.2=17.8, repurchase=100*0.35=35, daysSinceLastPurchase≈83*0.25=20.75, ltv≈92*0.15=13.8, agentEngagement=40*0.05=2 → score≈89
  assertRange(result.score, 80, 100, 'score alto para cliente fiel com múltiplas recompras')
  assertEq(result.snapshot.weights.dealActivity, 0, 'peso dealActivity = 0 em CUSTOMER')
}

section('CUSTOMER — sem recompra em 180 dias → score baixo, main driver coerente')
{
  const dormantCustomer: ContactSignals = {
    daysSinceLastInteraction: 60,
    daysSinceLastDealActivity: null,
    daysSinceLastPurchase: 180,
    repurchaseCount12m: 0,
    ltvBrl: 500,
    agentEngagementEventsLast30d: 0,
  }
  const result = computeHealthScore({
    contactId: CONTACT_ID,
    organizationId: ORG_ID,
    stage: 'CUSTOMER',
    signals: dormantCustomer,
  })
  // recency≈33*0.2=6.6, repurchase=0*0.35=0, daysSinceLastPurchase=0*0.25=0, ltv≈68*0.15=10.2, agentEngagement=0*0.05=0 → score≈17
  assertRange(result.score, 0, 30, 'score baixo para cliente dormant sem recompra')
  assert(
    result.snapshot.mainDriverKey === 'repurchaseFrequency' ||
      result.snapshot.mainDriverKey === 'daysSinceLastPurchase',
    `main driver é repurchaseFrequency ou daysSinceLastPurchase — got ${result.snapshot.mainDriverKey}`,
  )
}

// ---------------------------------------------------------------------------
// Invariantes gerais
// ---------------------------------------------------------------------------

section('Invariantes — score sempre dentro de 0–100 com valores extremos')
{
  const extremeHigh: ContactSignals = {
    daysSinceLastInteraction: 0,
    daysSinceLastDealActivity: 0,
    daysSinceLastPurchase: 0,
    repurchaseCount12m: 9999,
    ltvBrl: 9_999_999,
    agentEngagementEventsLast30d: 9999,
  }
  const extremeLow: ContactSignals = {
    daysSinceLastInteraction: 9999,
    daysSinceLastDealActivity: 9999,
    daysSinceLastPurchase: 9999,
    repurchaseCount12m: 0,
    ltvBrl: 0,
    agentEngagementEventsLast30d: 0,
  }

  for (const stage of ['LEAD', 'QUALIFIED', 'OPPORTUNITY', 'CUSTOMER'] as const) {
    const rHigh = computeHealthScore({ contactId: CONTACT_ID, organizationId: ORG_ID, stage, signals: extremeHigh })
    const rLow = computeHealthScore({ contactId: CONTACT_ID, organizationId: ORG_ID, stage, signals: extremeLow })
    assertRange(rHigh.score, 0, 100, `score 0–100 com sinais altíssimos (${stage})`)
    assertRange(rLow.score, 0, 100, `score 0–100 com sinais baixíssimos (${stage})`)
  }
}

section('Invariantes — sinais null não são apontados como main driver')
{
  // Com sinais nulos em LEAD, recency e dealActivity devem ser excluídos do main driver.
  // ltv e agentEngagement não têm sinal nulo → um deles vira main driver.
  const result = computeHealthScore({
    contactId: CONTACT_ID,
    organizationId: ORG_ID,
    stage: 'LEAD',
    signals: NULL_SIGNALS,
  })
  assert(
    result.snapshot.mainDriverKey !== 'recency' && result.snapshot.mainDriverKey !== 'dealActivity',
    `main driver não aponta componente com sinal null — got ${result.snapshot.mainDriverKey}`,
  )
  assertRange(result.score, 0, 100, 'score válido mesmo com todos os sinais temporais null')
}

section('Invariantes — agentEngagement satura em 5 eventos')
{
  const at5: ContactSignals = { ...NULL_SIGNALS, agentEngagementEventsLast30d: 5 }
  const at100: ContactSignals = { ...NULL_SIGNALS, agentEngagementEventsLast30d: 100 }

  const r5 = computeHealthScore({ contactId: CONTACT_ID, organizationId: ORG_ID, stage: 'LEAD', signals: at5 })
  const r100 = computeHealthScore({ contactId: CONTACT_ID, organizationId: ORG_ID, stage: 'LEAD', signals: at100 })

  assertEq(r5.snapshot.components.agentEngagement, 100, 'agentEngagement = 100 com 5 eventos')
  assertEq(r100.snapshot.components.agentEngagement, 100, 'agentEngagement = 100 com 100 eventos (saturado)')
  assertEq(r5.score, r100.score, 'score idêntico entre 5 e 100 eventos (saturação)')
}

section('Invariantes — contactId e organizationId preservados no resultado')
{
  const result = computeHealthScore({
    contactId: 'my-contact',
    organizationId: 'my-org',
    stage: 'LEAD',
    signals: FRESH_SIGNALS,
  })
  assertEq(result.contactId, 'my-contact', 'contactId preservado')
  assertEq(result.organizationId, 'my-org', 'organizationId preservado')
}

section('Invariantes — rawSignals preservados no snapshot')
{
  const result = computeHealthScore({
    contactId: CONTACT_ID,
    organizationId: ORG_ID,
    stage: 'CUSTOMER',
    signals: FRESH_SIGNALS,
  })
  assertEq(result.snapshot.rawSignals.ltvBrl, 10_000, 'rawSignals.ltvBrl preservado')
  assertEq(result.snapshot.rawSignals.repurchaseCount12m, 3, 'rawSignals.repurchaseCount12m preservado')
}

// ---------------------------------------------------------------------------
// Resultado final
// ---------------------------------------------------------------------------

console.log(`\n${passed + failed} assertions — ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}
