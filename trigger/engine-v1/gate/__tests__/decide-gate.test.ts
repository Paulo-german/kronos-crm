/**
 * Teste de unidade do gate determinístico (engine-v1, Fase 1b.1).
 *
 * COMO RODAR:
 *   pnpm tsx trigger/engine-v1/gate/__tests__/decide-gate.test.ts
 *
 * Função pura, sem banco. Cobre `required ⊆ ledger` → hold/advance, avanço múltiplo num
 * turno, "satisfeito" (provided + value não-vazio), a etapa de aviso (sem required roda ≥1
 * turno) e o ponteiro por ID (fallback quando currentStepId é null/inexistente).
 */
import assert from 'node:assert/strict'
import {
  decideGate,
  type GateSessionState,
  type StepRequirements,
} from '../decide-gate'
import type { AgentSessionState, Observed } from '../../ledger/schema'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function obs(overrides: Partial<Observed> = {}): Observed {
  return {
    value: 'x',
    nature: 'provided',
    polarity: 'neutral',
    askedAtTurns: [],
    observedAtTurn: 1,
    source: 'extracted',
    ...overrides,
  }
}

// Default: já rodou 1 turno na etapa atual (turnCount 1 > enteredAt 0). Cada teste passa o
// `currentStepId` da etapa onde "já estamos" (ou null pra testar o fallback).
function session(overrides: Partial<GateSessionState> = {}): GateSessionState {
  return {
    currentStepId: null,
    turnCount: 1,
    stepEnteredAtTurn: 0,
    ...overrides,
  }
}

type Attributes = AgentSessionState['attributes']

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface TestResult {
  name: string
  passed: boolean
  error?: string
}
const results: TestResult[] = []

function test(name: string, fn: () => void): void {
  try {
    fn()
    results.push({ name, passed: true })
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ---------------------------------------------------------------------------
// Cenários — required (hold/advance)
// ---------------------------------------------------------------------------

test('etapa atual incompleta → HOLD com os pendentes', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['vehicle', 'city'] },
  ]
  const attributes: Attributes = { vehicle: obs({ value: 'Honda Civic' }) }
  const decision = decideGate(
    steps,
    attributes,
    session({ currentStepId: 'a' }),
  )
  assert.equal(decision.nextStepId, 'a')
  assert.deepEqual(decision.pendingRequired, ['city'])
  assert.equal(decision.advanced, false)
})

test('etapa completa + próxima com pendência → AVANÇA uma', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['name'] },
    { id: 'b', order: 1, requiredKeys: ['vehicle'] },
  ]
  const attributes: Attributes = { name: obs({ value: 'Paulo' }) }
  const decision = decideGate(
    steps,
    attributes,
    session({ currentStepId: 'a' }),
  )
  assert.equal(decision.nextStepId, 'b')
  assert.deepEqual(decision.pendingRequired, ['vehicle'])
  assert.equal(decision.advanced, true)
})

test('lead despeja tudo → pula VÁRIAS etapas até a pendência', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['name'] },
    { id: 'b', order: 1, requiredKeys: ['vehicle'] },
    { id: 'c', order: 2, requiredKeys: ['city'] },
  ]
  const attributes: Attributes = {
    name: obs({ value: 'Paulo' }),
    vehicle: obs({ value: 'Civic' }),
  }
  const decision = decideGate(
    steps,
    attributes,
    session({ currentStepId: 'a' }),
  )
  assert.equal(decision.nextStepId, 'c')
  assert.deepEqual(decision.pendingRequired, ['city'])
  assert.equal(decision.advanced, true)
})

test('todas as etapas completas → para na última, sem pendência', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['name'] },
    { id: 'b', order: 1, requiredKeys: ['vehicle'] },
  ]
  const attributes: Attributes = {
    name: obs({ value: 'Paulo' }),
    vehicle: obs({ value: 'Civic' }),
  }
  const decision = decideGate(
    steps,
    attributes,
    session({ currentStepId: 'a' }),
  )
  assert.equal(decision.nextStepId, 'b')
  assert.deepEqual(decision.pendingRequired, [])
  assert.equal(decision.advanced, true)
})

test('adiar/recusar/evadir NÃO satisfaz (fica pendente)', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['city'] },
  ]
  const natures: Observed['nature'][] = ['deferred', 'refused', 'evasive']
  for (const nature of natures) {
    const attributes: Attributes = { city: obs({ nature, value: 'depois' }) }
    const decision = decideGate(
      steps,
      attributes,
      session({ currentStepId: 'a' }),
    )
    assert.deepEqual(
      decision.pendingRequired,
      ['city'],
      `nature "${nature}" deveria ficar pendente`,
    )
  }
})

test('provided com value vazio NÃO satisfaz', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['city'] },
  ]
  const attributes: Attributes = {
    city: obs({ nature: 'provided', value: '   ' }),
  }
  const decision = decideGate(
    steps,
    attributes,
    session({ currentStepId: 'a' }),
  )
  assert.deepEqual(decision.pendingRequired, ['city'])
})

test('já na última etapa com pendência → HOLD, não avança', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['name'] },
    { id: 'b', order: 1, requiredKeys: ['vehicle'] },
  ]
  const attributes: Attributes = { name: obs({ value: 'Paulo' }) }
  const decision = decideGate(
    steps,
    attributes,
    session({ currentStepId: 'b' }),
  )
  assert.equal(decision.nextStepId, 'b')
  assert.deepEqual(decision.pendingRequired, ['vehicle'])
  assert.equal(decision.advanced, false)
})

test('agente sem etapas → sem gate (nextStepId null)', () => {
  const decision = decideGate([], {}, session({ currentStepId: null }))
  assert.equal(decision.nextStepId, null)
  assert.deepEqual(decision.pendingRequired, [])
  assert.equal(decision.advanced, false)
})

test('múltiplos required numa etapa → pendentes só os que faltam, em ordem', () => {
  const steps: StepRequirements[] = [
    {
      id: 'a',
      order: 0,
      requiredKeys: ['vehicle', 'version', 'city', 'usage'],
    },
  ]
  const attributes: Attributes = {
    vehicle: obs({ value: 'Civic' }),
    city: obs({ value: 'Niterói' }),
  }
  const decision = decideGate(
    steps,
    attributes,
    session({ currentStepId: 'a' }),
  )
  assert.deepEqual(decision.pendingRequired, ['version', 'usage'])
})

// ---------------------------------------------------------------------------
// Cenários — etapa de aviso (sem required roda ≥1 turno)
// ---------------------------------------------------------------------------

test('etapa de aviso de partida NÃO-visitada → HOLD (roda o turno)', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: [] }, // aviso/saudação
    { id: 'b', order: 1, requiredKeys: ['vehicle'] },
  ]
  // turnCount === stepEnteredAtTurn → ainda não rodou nenhum turno nesta etapa.
  const decision = decideGate(
    steps,
    {},
    session({ currentStepId: 'a', turnCount: 0, stepEnteredAtTurn: 0 }),
  )
  assert.equal(decision.nextStepId, 'a')
  assert.deepEqual(decision.pendingRequired, [])
  assert.equal(decision.advanced, false)
})

test('etapa de aviso de partida JÁ-visitada → avança', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: [] },
    { id: 'b', order: 1, requiredKeys: ['vehicle'] },
  ]
  // turnCount (1) > stepEnteredAtTurn (0) → já rodou → pode avançar.
  const decision = decideGate(
    steps,
    {},
    session({ currentStepId: 'a', turnCount: 1, stepEnteredAtTurn: 0 }),
  )
  assert.equal(decision.nextStepId, 'b')
  assert.deepEqual(decision.pendingRequired, ['vehicle'])
  assert.equal(decision.advanced, true)
})

test('avanço múltiplo PARA na etapa de aviso alcançada (ela roda 1 turno)', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['name'] }, // satisfeita → pula
    { id: 'b', order: 1, requiredKeys: [] }, // aviso alcançado → para aqui
    { id: 'c', order: 2, requiredKeys: ['vehicle'] },
  ]
  const attributes: Attributes = { name: obs({ value: 'Paulo' }) }
  const decision = decideGate(
    steps,
    attributes,
    session({ currentStepId: 'a', turnCount: 1, stepEnteredAtTurn: 0 }),
  )
  assert.equal(decision.nextStepId, 'b')
  assert.deepEqual(decision.pendingRequired, [])
  assert.equal(decision.advanced, true)
})

test('última etapa de aviso alcançada → fica nela (roda a partir daí)', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['name'] }, // satisfeita → pula
    { id: 'b', order: 1, requiredKeys: [] }, // aviso, é a última → fica
  ]
  const attributes: Attributes = { name: obs({ value: 'Paulo' }) }
  const decision = decideGate(
    steps,
    attributes,
    session({ currentStepId: 'a', turnCount: 1, stepEnteredAtTurn: 0 }),
  )
  assert.equal(decision.nextStepId, 'b')
  assert.deepEqual(decision.pendingRequired, [])
  assert.equal(decision.advanced, true)
})

// ---------------------------------------------------------------------------
// Cenários — ponteiro por ID (fallback)
// ---------------------------------------------------------------------------

test('currentStepId null (sessão nova) → resolve pra primeira etapa', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['name'] },
    { id: 'b', order: 1, requiredKeys: ['vehicle'] },
  ]
  const decision = decideGate(steps, {}, session({ currentStepId: null }))
  assert.equal(decision.nextStepId, 'a')
  assert.deepEqual(decision.pendingRequired, ['name'])
})

test('currentStepId inexistente (etapa deletada) → fallback pra primeira, ledger reconstrói', () => {
  const steps: StepRequirements[] = [
    { id: 'a', order: 0, requiredKeys: ['name'] },
    { id: 'c', order: 2, requiredKeys: ['city'] }, // 'b' (order 1) foi deletada → buraco
  ]
  // Estava em 'b' (deletada) → currentStepId órfão; name já coletado.
  const attributes: Attributes = { name: obs({ value: 'Paulo' }) }
  const decision = decideGate(
    steps,
    attributes,
    session({ currentStepId: 'b' }),
  )
  // re-resolve do início, pula 'a' (satisfeita) e para em 'c' — sem tropeçar no buraco.
  assert.equal(decision.nextStepId, 'c')
  assert.deepEqual(decision.pendingRequired, ['city'])
})

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

console.log('[GATE TEST] Iniciando...\n')

let allPassed = true
for (const result of results) {
  const status = result.passed ? 'PASS' : 'FAIL'
  console.log(`[${status}] ${result.name}`)
  if (!result.passed) {
    allPassed = false
    console.error(`       ${result.error}`)
  }
}

if (!allPassed) {
  console.error('\n[GATE TEST] FALHA — um ou mais cenários falharam.')
  process.exit(1)
}

console.log('\n[GATE TEST] Todos os cenários passaram.')
process.exit(0)
