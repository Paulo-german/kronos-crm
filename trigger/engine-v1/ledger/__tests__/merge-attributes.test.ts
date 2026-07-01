/**
 * Teste de unidade do merge de atributos do ledger (engine-v1).
 *
 * COMO RODAR:
 *   pnpm tsx trigger/engine-v1/ledger/__tests__/merge-attributes.test.ts
 *
 * Não depende de banco nem de env — função pura. Foco na regra do `observedAtTurn`:
 * reconfirmar um fato idêntico NÃO envelhece o turno; só uma mudança real avança.
 */
import assert from 'node:assert/strict'
import type { ExtractedField } from '../../extractor/extract-attributes'
import { mergeExtractedFields } from '../merge-attributes'
import type { AgentSessionState, Observed } from '../schema'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeState(
  attributes: AgentSessionState['attributes'] = {},
): AgentSessionState {
  return { attributes }
}

function makeObserved(overrides: Partial<Observed> = {}): Observed {
  return {
    value: 'Honda Civic',
    nature: 'provided',
    polarity: 'neutral',
    askedAtTurns: [],
    observedAtTurn: 2,
    source: 'extracted',
    ...overrides,
  }
}

function field(
  key: string,
  value: string,
  overrides: Partial<Pick<ExtractedField, 'nature' | 'polarity'>> = {},
): ExtractedField {
  return { key, value, nature: 'provided', polarity: 'neutral', ...overrides }
}

// ---------------------------------------------------------------------------
// Harness mínimo (mesmo estilo do parity test: coleta erros, exit code no fim)
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

test('campo novo grava com o turno atual', () => {
  const state = makeState()
  mergeExtractedFields(state, [field('vehicle', 'Honda Civic')], 2)
  assert.equal(state.attributes.vehicle.value, 'Honda Civic')
  assert.equal(state.attributes.vehicle.observedAtTurn, 2)
  assert.equal(state.attributes.vehicle.source, 'extracted')
})

test('reconfirmação idêntica NÃO envelhece o turno', () => {
  // O caso do bug: "Honda Civic" dito no turno 2, re-lido pelo extrator no turno 5.
  const state = makeState({ vehicle: makeObserved({ observedAtTurn: 2 }) })
  mergeExtractedFields(state, [field('vehicle', 'Honda Civic')], 5)
  assert.equal(state.attributes.vehicle.observedAtTurn, 2)
})

test('mudança de value avança o turno', () => {
  const state = makeState({
    vehicle: makeObserved({ value: 'Honda Civic', observedAtTurn: 2 }),
  })
  mergeExtractedFields(state, [field('vehicle', 'Honda City')], 5)
  assert.equal(state.attributes.vehicle.value, 'Honda City')
  assert.equal(state.attributes.vehicle.observedAtTurn, 5)
})

test('mudança de nature (value igual) avança o turno', () => {
  // deferred ("te mando depois") → refused ("não vou informar"), value vazio nos dois.
  const state = makeState({
    city: makeObserved({ value: '', nature: 'deferred', observedAtTurn: 3 }),
  })
  mergeExtractedFields(state, [field('city', '', { nature: 'refused' })], 6)
  assert.equal(state.attributes.city.nature, 'refused')
  assert.equal(state.attributes.city.observedAtTurn, 6)
})

test('mudança de polarity (value/nature iguais) avança o turno', () => {
  const state = makeState({
    interest: makeObserved({
      value: 'sim',
      polarity: 'neutral',
      observedAtTurn: 2,
    }),
  })
  mergeExtractedFields(
    state,
    [field('interest', 'sim', { polarity: 'negative' })],
    4,
  )
  assert.equal(state.attributes.interest.polarity, 'negative')
  assert.equal(state.attributes.interest.observedAtTurn, 4)
})

test('askedAtTurns é preservado ao atualizar um fato', () => {
  const state = makeState({
    vehicle: makeObserved({
      value: 'Honda Civic',
      askedAtTurns: [1, 3],
      observedAtTurn: 3,
    }),
  })
  mergeExtractedFields(state, [field('vehicle', 'Honda City')], 5)
  assert.deepEqual(state.attributes.vehicle.askedAtTurns, [1, 3])
})

test('reconfirmação idêntica preserva o source não-extracted (ex: seeded)', () => {
  const state = makeState({
    name: makeObserved({ value: 'Paulo', source: 'seeded', observedAtTurn: 1 }),
  })
  mergeExtractedFields(state, [field('name', 'Paulo')], 4)
  assert.equal(state.attributes.name.source, 'seeded')
  assert.equal(state.attributes.name.observedAtTurn, 1)
})

test('múltiplos campos: reconfirmado preserva, mudado avança, novo entra', () => {
  const state = makeState({
    vehicle: makeObserved({ value: 'Honda Civic', observedAtTurn: 2 }),
    city: makeObserved({ value: 'Rio', observedAtTurn: 2 }),
  })
  mergeExtractedFields(
    state,
    [
      field('vehicle', 'Honda Civic'), // reconfirma
      field('city', 'Niterói'), // muda
      field('usage', 'aplicativo'), // novo
    ],
    5,
  )
  assert.equal(state.attributes.vehicle.observedAtTurn, 2)
  assert.equal(state.attributes.city.observedAtTurn, 5)
  assert.equal(state.attributes.city.value, 'Niterói')
  assert.equal(state.attributes.usage.observedAtTurn, 5)
})

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

console.log('[MERGE TEST] Iniciando...\n')

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
  console.error('\n[MERGE TEST] FALHA — um ou mais cenários falharam.')
  process.exit(1)
}

console.log('\n[MERGE TEST] Todos os cenários passaram.')
process.exit(0)
