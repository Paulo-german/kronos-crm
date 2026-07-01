/**
 * Teste de unidade do gate determinístico (engine-v1, Fase 1b.1).
 *
 * COMO RODAR:
 *   pnpm tsx trigger/engine-v1/gate/__tests__/decide-gate.test.ts
 *
 * Função pura, sem banco. Cobre `required ⊆ ledger` → hold/advance, avanço múltiplo num
 * turno, etapa sem portão, e o que conta como "satisfeito" (provided + value não-vazio).
 */
import assert from 'node:assert/strict'
import { decideGate, type StepRequirements } from '../decide-gate'
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

type Attributes = AgentSessionState['attributes']

// ---------------------------------------------------------------------------
// Harness (mesmo estilo dos outros testes do engine)
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
// Cenários
// ---------------------------------------------------------------------------

test('etapa atual incompleta → HOLD com os pendentes', () => {
  const steps: StepRequirements[] = [
    { order: 0, requiredKeys: ['vehicle', 'city'] },
  ]
  const attributes: Attributes = { vehicle: obs({ value: 'Honda Civic' }) }
  const decision = decideGate(steps, attributes, 0)
  assert.equal(decision.nextStepOrder, 0)
  assert.deepEqual(decision.pendingRequired, ['city'])
  assert.equal(decision.advanced, false)
})

test('etapa completa + próxima com pendência → AVANÇA uma', () => {
  const steps: StepRequirements[] = [
    { order: 0, requiredKeys: ['name'] },
    { order: 1, requiredKeys: ['vehicle'] },
  ]
  const attributes: Attributes = { name: obs({ value: 'Paulo' }) }
  const decision = decideGate(steps, attributes, 0)
  assert.equal(decision.nextStepOrder, 1)
  assert.deepEqual(decision.pendingRequired, ['vehicle'])
  assert.equal(decision.advanced, true)
})

test('lead despeja tudo → pula VÁRIAS etapas até a pendência', () => {
  const steps: StepRequirements[] = [
    { order: 0, requiredKeys: ['name'] },
    { order: 1, requiredKeys: ['vehicle'] },
    { order: 2, requiredKeys: ['city'] },
  ]
  const attributes: Attributes = {
    name: obs({ value: 'Paulo' }),
    vehicle: obs({ value: 'Civic' }),
  }
  const decision = decideGate(steps, attributes, 0)
  assert.equal(decision.nextStepOrder, 2)
  assert.deepEqual(decision.pendingRequired, ['city'])
  assert.equal(decision.advanced, true)
})

test('todas as etapas completas → para na última, sem pendência', () => {
  const steps: StepRequirements[] = [
    { order: 0, requiredKeys: ['name'] },
    { order: 1, requiredKeys: ['vehicle'] },
  ]
  const attributes: Attributes = {
    name: obs({ value: 'Paulo' }),
    vehicle: obs({ value: 'Civic' }),
  }
  const decision = decideGate(steps, attributes, 0)
  assert.equal(decision.nextStepOrder, 1)
  assert.deepEqual(decision.pendingRequired, [])
  assert.equal(decision.advanced, true)
})

test('etapa sem required (portão aberto) → avança por ela', () => {
  const steps: StepRequirements[] = [
    { order: 0, requiredKeys: [] },
    { order: 1, requiredKeys: ['vehicle'] },
  ]
  const decision = decideGate(steps, {}, 0)
  assert.equal(decision.nextStepOrder, 1)
  assert.deepEqual(decision.pendingRequired, ['vehicle'])
})

test('adiar/recusar/evadir NÃO satisfaz (fica pendente)', () => {
  const steps: StepRequirements[] = [{ order: 0, requiredKeys: ['city'] }]
  const natures: Observed['nature'][] = ['deferred', 'refused', 'evasive']
  for (const nature of natures) {
    // value preenchido de propósito: é a NATUREZA que decide, não só o texto.
    const attributes: Attributes = { city: obs({ nature, value: 'depois' }) }
    const decision = decideGate(steps, attributes, 0)
    assert.deepEqual(
      decision.pendingRequired,
      ['city'],
      `nature "${nature}" deveria ficar pendente`,
    )
  }
})

test('provided com value vazio NÃO satisfaz', () => {
  const steps: StepRequirements[] = [{ order: 0, requiredKeys: ['city'] }]
  const attributes: Attributes = {
    city: obs({ nature: 'provided', value: '   ' }),
  }
  const decision = decideGate(steps, attributes, 0)
  assert.deepEqual(decision.pendingRequired, ['city'])
})

test('já na última etapa com pendência → HOLD, não avança', () => {
  const steps: StepRequirements[] = [
    { order: 0, requiredKeys: ['name'] },
    { order: 1, requiredKeys: ['vehicle'] },
  ]
  const attributes: Attributes = { name: obs({ value: 'Paulo' }) }
  const decision = decideGate(steps, attributes, 1)
  assert.equal(decision.nextStepOrder, 1)
  assert.deepEqual(decision.pendingRequired, ['vehicle'])
  assert.equal(decision.advanced, false)
})

test('agente sem etapas → sem gate (conversa livre)', () => {
  const decision = decideGate([], {}, 0)
  assert.equal(decision.nextStepOrder, 0)
  assert.deepEqual(decision.pendingRequired, [])
  assert.equal(decision.advanced, false)
})

test('múltiplos required numa etapa → pendentes só os que faltam, em ordem', () => {
  const steps: StepRequirements[] = [
    { order: 0, requiredKeys: ['vehicle', 'version', 'city', 'usage'] },
  ]
  const attributes: Attributes = {
    vehicle: obs({ value: 'Civic' }),
    city: obs({ value: 'Niterói' }),
  }
  const decision = decideGate(steps, attributes, 0)
  assert.deepEqual(decision.pendingRequired, ['version', 'usage'])
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
