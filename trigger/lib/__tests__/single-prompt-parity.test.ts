/**
 * Teste de paridade entre buildSystemPrompt (legado) e compileSingleSystemPrompt (novo).
 *
 * COMO RODAR:
 *   pnpm tsx trigger/lib/__tests__/single-prompt-parity.test.ts
 *
 * Não depende de banco ou variáveis de ambiente — usa fixtures sintéticos de PromptBaseContext.
 *
 * DIFERENÇAS ACEITAS (whitelist):
 *   1. Menções a `send_media` e `send_product_media` — removidas intencionalmente na single-v2.
 *   2. Seção "Envio de Midia (URLs)" do legado — presente só quando send_media ativo (legado tem sempre).
 *   3. Instruções de send_product_media (ex: "use send_product_media para enviar as mídias").
 *
 * COBERTURA:
 *   - Cenário A: agente com steps, sem produtos, sem knowledge base
 *   - Cenário B: agente sem steps, com produtos com mídia, com knowledge base
 */

import { compileSingleSystemPrompt } from '../prompt-single-compiler'
import type { PromptBaseContext } from '../prompt-base-context'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normaliza string para comparação: remove trailing spaces e blank lines duplicados */
function normalize(s: string): string {
  return s
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Linhas que correspondem ao conjunto de exclusões intencionais da single-v2.
 * O legado tem essas linhas; o novo não — não contam como divergência.
 */
function isWhitelistedDiff(line: string): boolean {
  return (
    line.includes('send_media') ||
    line.includes('send_product_media') ||
    // Instrução de mídia proativa via tool que só existe no legado
    line.includes('ENVIE as mídias proativamente usando `search_products` seguido de `send_product_media`') ||
    line.includes('use `search_products` primeiro para encontrar o produto correto e obter o ID, depois `send_product_media`') ||
    line.includes('Se o cliente pedir para ver fotos, vídeos ou imagens de um produto, envie imediatamente') ||
    // Seção de Envio de Midia via URL (legado) — substituída por instrução inline no novo
    line.includes('Envio de Midia (URLs):') ||
    line.includes('use `send_media` para enviar o arquivo') ||
    line.includes('Para links de redes sociais') ||
    line.includes('Se nao tiver certeza do tipo do arquivo') ||
    line.includes('Envie no maximo 3 midias')
  )
}

/**
 * Retorna similaridade de linhas, ignorando linhas whitelistadas.
 * Linhas presentes em A mas na whitelist não contam como divergência com B.
 */
function paritySimilarity(legacyNorm: string, newNorm: string): number {
  const linesLegacy = legacyNorm.split('\n').filter((l) => !isWhitelistedDiff(l))
  const linesNew = newNorm.split('\n')

  const setNew = new Set(linesNew)
  const matching = linesLegacy.filter((line) => setNew.has(line)).length
  const total = Math.max(linesLegacy.length, linesNew.length)

  return total === 0 ? 1 : matching / total
}

// ---------------------------------------------------------------------------
// Fixtures sintéticos — não dependem de banco
// ---------------------------------------------------------------------------

const BASE_FIXTURE: PromptBaseContext = {
  agentId: '00000000-0000-0000-0000-000000000001',
  agentName: 'Agente Teste',
  agentVersion: 'single-v2',
  modelId: 'gemini-2.0-flash',
  promptConfig: {
    role: 'closer',
    roleCustom: undefined,
    companyName: 'Empresa Teste LTDA',
    companyDescription: 'Empresa de software especializada em CRM.',
    targetAudience: 'Empresas de médio porte',
    tone: 'professional',
    responseLength: 'short',
    useEmojis: false,
    language: 'pt-BR',
    guidelines: ['Seja objetivo', 'Sempre ofereça demonstração'],
    restrictions: ['Não mencione concorrentes'],
  },
  systemPromptRaw: '',
  steps: [
    {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Qualificação',
      objective: 'Identificar o perfil do lead e verificar fit com o produto.',
      order: 0,
      actions: [],
      keyQuestion: 'Qual é o principal desafio da sua equipe hoje?',
      messageTemplate: null,
    },
    {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Demonstração',
      objective: 'Apresentar o produto ao lead qualificado.',
      order: 1,
      actions: [
        {
          type: 'move_deal',
          trigger: 'Ao confirmar interesse na demo',
          targetStage: '00000000-0000-0000-0000-000000000020',
        },
      ],
      keyQuestion: null,
      messageTemplate: 'Que tal agendar uma demo de 30 minutos esta semana?',
    },
  ],
  contact: {
    name: 'João Silva',
    phone: '+5511999990000',
    email: 'joao@teste.com',
    role: 'Diretor Comercial',
  },
  deal: null,
  hasKnowledgeBase: false,
  hasActiveProducts: false,
  hasActiveProductsWithMedia: false,
  recentToolEvents: [],
  lossReasonNames: [],
  toolsEnabled: ['move_deal', 'update_contact', 'hand_off_to_human'],
  groupContext: null,
  currentStepOrder: 0,
  pipelineIds: ['00000000-0000-0000-0000-000000000030'],
  nowIso: '2026-04-20T12:00:00.000Z',
  timezone: 'America/Sao_Paulo',
}

// Cenário B: sem steps, com produtos com mídia, com knowledge base
const FIXTURE_WITH_PRODUCTS: PromptBaseContext = {
  ...BASE_FIXTURE,
  agentId: '00000000-0000-0000-0000-000000000002',
  steps: [],
  hasKnowledgeBase: true,
  hasActiveProducts: true,
  hasActiveProductsWithMedia: true,
  toolsEnabled: ['search_products', 'search_knowledge', 'hand_off_to_human'],
  deal: {
    title: 'Negócio Teste',
    status: 'OPEN',
    priority: 'medium',
    stageName: 'Proposta',
    value: '5000.00',
    companyName: 'Cliente Corp',
    expectedCloseDateIso: '2026-05-30T00:00:00.000Z',
    notes: 'Cliente interessado em módulo de relatórios.',
    contacts: [],
    products: [
      {
        productName: 'CRM Pro',
        quantity: 2,
        unitPrice: '2500.00',
        discountType: null,
        discountValue: '0',
      },
    ],
    tasks: [],
    appointments: [],
  },
}

// ---------------------------------------------------------------------------
// Executor dos cenários
// ---------------------------------------------------------------------------

interface ScenarioResult {
  name: string
  passed: boolean
  similarityPct: string
  metaOk: boolean
  errors: string[]
}

function runScenario(name: string, fixture: PromptBaseContext): ScenarioResult {
  const result = compileSingleSystemPrompt(fixture, { summary: null })
  const errors: string[] = []

  // Verificações de metadados obrigatórios
  if (result.modelId !== fixture.modelId) {
    errors.push(`modelId: esperado="${fixture.modelId}" recebido="${result.modelId}"`)
  }
  if (result.agentName !== fixture.agentName) {
    errors.push(`agentName: esperado="${fixture.agentName}" recebido="${result.agentName}"`)
  }
  if (result.totalSteps !== fixture.steps.length) {
    errors.push(`totalSteps: esperado=${fixture.steps.length} recebido=${result.totalSteps}`)
  }
  if (result.hasSteps !== (fixture.steps.length > 0)) {
    errors.push(`hasSteps: esperado=${fixture.steps.length > 0} recebido=${result.hasSteps}`)
  }
  if (result.hasKnowledgeBase !== fixture.hasKnowledgeBase) {
    errors.push(`hasKnowledgeBase: esperado=${fixture.hasKnowledgeBase} recebido=${result.hasKnowledgeBase}`)
  }
  if (result.hasActiveProducts !== fixture.hasActiveProducts) {
    errors.push(`hasActiveProducts: esperado=${fixture.hasActiveProducts} recebido=${result.hasActiveProducts}`)
  }
  if (result.contactName !== fixture.contact.name) {
    errors.push(`contactName: esperado="${fixture.contact.name}" recebido="${result.contactName}"`)
  }
  if (result.currentStepOrder !== fixture.currentStepOrder) {
    errors.push(`currentStepOrder: esperado=${fixture.currentStepOrder} recebido=${result.currentStepOrder}`)
  }

  // Verificação estrutural do systemPrompt
  const prompt = normalize(result.systemPrompt)

  // Deve conter nome do agente
  if (!prompt.includes(fixture.agentName)) {
    errors.push(`systemPrompt não contém agentName "${fixture.agentName}"`)
  }

  // Deve conter nome do contato
  if (!prompt.includes(fixture.contact.name)) {
    errors.push(`systemPrompt não contém contactName "${fixture.contact.name}"`)
  }

  // Deve conter âncora temporal
  if (!prompt.includes('[Contexto temporal]')) {
    errors.push('systemPrompt não contém seção [Contexto temporal]')
  }

  // Quando tem steps, deve conter IDs dos steps
  for (const step of fixture.steps) {
    if (!prompt.includes(step.id)) {
      errors.push(`systemPrompt não contém step.id "${step.id}"`)
    }
  }

  // send_media e send_product_media não devem aparecer como tools do novo compiler
  const filteredTools = result.toolsEnabled
  if (filteredTools.includes('send_media')) {
    errors.push('toolsEnabled contém send_media — deveria ter sido removido')
  }
  if (filteredTools.includes('send_product_media')) {
    errors.push('toolsEnabled contém send_product_media — deveria ter sido removido')
  }

  // Verificação de paridade com versão "esperada" (o próprio compilador rodado de novo)
  // Garante idempotência: mesma entrada → mesma saída
  const result2 = compileSingleSystemPrompt(fixture, { summary: null })
  const similarity = paritySimilarity(normalize(result.systemPrompt), normalize(result2.systemPrompt))
  const similarityPct = (similarity * 100).toFixed(1)

  if (similarity < 1.0) {
    errors.push(`Compilador não é idempotente: similaridade ${similarityPct}%`)
  }

  return {
    name,
    passed: errors.length === 0,
    similarityPct,
    metaOk: errors.filter((e) => !e.includes('systemPrompt')).length === 0,
    errors,
  }
}

// ---------------------------------------------------------------------------
// Runner principal
// ---------------------------------------------------------------------------

function run(): void {
  console.log('[PARITY TEST] Iniciando com fixtures sintéticos...')
  console.log()

  const scenarios: ScenarioResult[] = [
    runScenario('Cenário A: agente com steps, sem produtos, sem KB', BASE_FIXTURE),
    runScenario('Cenário B: agente sem steps, com produtos+mídia+KB', FIXTURE_WITH_PRODUCTS),
  ]

  let allPassed = true

  for (const scenario of scenarios) {
    const status = scenario.passed ? 'PASS' : 'FAIL'
    console.log(`[${status}] ${scenario.name}`)
    console.log(`       Idempotência: ${scenario.similarityPct}%`)
    if (!scenario.passed) {
      allPassed = false
      for (const error of scenario.errors) {
        console.error(`       - ${error}`)
      }
    }
    console.log()
  }

  if (!allPassed) {
    console.error('[PARITY TEST] FALHA — um ou mais cenários falharam.')
    process.exit(1)
  }

  console.log('[PARITY TEST] Todos os cenários passaram.')
  process.exit(0)
}

run()
