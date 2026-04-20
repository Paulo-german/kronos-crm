/**
 * Teste de paridade entre buildSystemPrompt (legado) e compileSingleSystemPrompt (novo).
 *
 * COMO RODAR:
 *   pnpm tsx trigger/lib/__tests__/single-prompt-parity.test.ts
 *
 * Pré-requisitos:
 *   - .env com DATABASE_URL válido (mesmo banco de dev/test)
 *   - Ao menos uma conversa existente no banco com agentId e conversationId reais
 *
 * TODO: Substituir por teste Vitest quando o projeto adicionar test runner.
 *
 * RESULTADO ESPERADO:
 *   - similaridade >= 95% (excluindo trechos de send_media / send_product_media)
 *   - Os campos de metadados (modelId, agentName, steps, etc.) devem bater 100%
 *
 * DIFERENÇAS ACEITÁVEIS (whitelist):
 *   1. Menções a `send_media` e `send_product_media` — removidas intencionalmente
 *   2. Formato do header temporal: legado usa "UTC-3, horário de Brasília" fixo;
 *      novo idem (o timezone do banco pode divergir — aceito em smoke tests)
 *   3. Quebras de linha trailing em seções opcionais (normalizado no diff)
 */

import 'dotenv/config'
import { buildSystemPrompt } from '../../build-system-prompt'
import { buildPromptBaseContext } from '../prompt-base-context'
import { compileSingleSystemPrompt } from '../prompt-single-compiler'

// ---------------------------------------------------------------------------
// Dados de fixture — substitua por IDs reais do seu banco de dev/test
// ---------------------------------------------------------------------------

const FIXTURE = {
  agentId: process.env.PARITY_TEST_AGENT_ID ?? '',
  conversationId: process.env.PARITY_TEST_CONVERSATION_ID ?? '',
  organizationId: process.env.PARITY_TEST_ORG_ID ?? '',
}

// ---------------------------------------------------------------------------
// Helpers de diff
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
 * Retorna similaridade de caracteres via Longest Common Subsequence (aproximado).
 * Para textos grandes, usa diff por linha que é O(N) não O(N²).
 */
function lineSimilarity(a: string, b: string): number {
  const linesA = a.split('\n')
  const linesB = b.split('\n')

  const setA = new Set(linesA)
  const matching = linesB.filter((line) => setA.has(line)).length
  const total = Math.max(linesA.length, linesB.length)

  return total === 0 ? 1 : matching / total
}

/**
 * Remove menções às tools excluídas da single-v2.
 * Usado para normalizar o legado antes do diff — as diferenças de send_media
 * são intencionais e não devem contar como divergência.
 */
function stripExcludedToolMentions(s: string): string {
  // Remove linhas que contêm send_media ou send_product_media (descrição de tool)
  return s
    .split('\n')
    .filter((line) => !line.includes('send_media') && !line.includes('send_product_media'))
    .join('\n')
}

// ---------------------------------------------------------------------------
// Runner principal
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  if (!FIXTURE.agentId || !FIXTURE.conversationId || !FIXTURE.organizationId) {
    console.warn(
      '[PARITY TEST] Variáveis de fixture não configuradas.\n' +
        'Defina PARITY_TEST_AGENT_ID, PARITY_TEST_CONVERSATION_ID e PARITY_TEST_ORG_ID no .env.\n' +
        '[PARITY TEST] Saindo sem falha — este teste é mitigação, não gate.',
    )
    process.exit(0)
  }

  console.log('[PARITY TEST] Iniciando...')
  console.log(`  agentId:         ${FIXTURE.agentId}`)
  console.log(`  conversationId:  ${FIXTURE.conversationId}`)
  console.log(`  organizationId:  ${FIXTURE.organizationId}`)
  console.log()

  // Chamadas paralelas para minimizar diferença de tempo entre as duas fontes
  const [legacyResult, baseContext] = await Promise.all([
    buildSystemPrompt(FIXTURE.agentId, FIXTURE.conversationId, FIXTURE.organizationId),
    buildPromptBaseContext(FIXTURE.agentId, FIXTURE.conversationId, FIXTURE.organizationId, null),
  ])

  const compiledResult = compileSingleSystemPrompt(baseContext, {
    summary: legacyResult.summary,
  })

  // --- Comparação de metadados (deve bater 100%) ---
  const metaMismatches: string[] = []

  if (legacyResult.modelId !== compiledResult.modelId) {
    metaMismatches.push(`modelId: legacy="${legacyResult.modelId}" new="${compiledResult.modelId}"`)
  }
  if (legacyResult.agentName !== compiledResult.agentName) {
    metaMismatches.push(
      `agentName: legacy="${legacyResult.agentName}" new="${compiledResult.agentName}"`,
    )
  }
  if (legacyResult.currentStepOrder !== compiledResult.currentStepOrder) {
    metaMismatches.push(
      `currentStepOrder: legacy=${legacyResult.currentStepOrder} new=${compiledResult.currentStepOrder}`,
    )
  }
  if (legacyResult.totalSteps !== compiledResult.totalSteps) {
    metaMismatches.push(
      `totalSteps: legacy=${legacyResult.totalSteps} new=${compiledResult.totalSteps}`,
    )
  }
  if (legacyResult.hasKnowledgeBase !== compiledResult.hasKnowledgeBase) {
    metaMismatches.push(
      `hasKnowledgeBase: legacy=${legacyResult.hasKnowledgeBase} new=${compiledResult.hasKnowledgeBase}`,
    )
  }
  if (legacyResult.hasActiveProducts !== compiledResult.hasActiveProducts) {
    metaMismatches.push(
      `hasActiveProducts: legacy=${legacyResult.hasActiveProducts} new=${compiledResult.hasActiveProducts}`,
    )
  }
  if (legacyResult.contactName !== compiledResult.contactName) {
    metaMismatches.push(
      `contactName: legacy="${legacyResult.contactName}" new="${compiledResult.contactName}"`,
    )
  }

  if (metaMismatches.length > 0) {
    console.error('[PARITY TEST] FALHA — divergência em metadados:')
    metaMismatches.forEach((m) => console.error(`  - ${m}`))
    process.exit(1)
  }

  console.log('[PARITY TEST] Metadados: OK (100% match)')

  // --- Comparação do systemPrompt (alvo: >= 95%) ---
  const legacyNorm = normalize(stripExcludedToolMentions(legacyResult.systemPrompt))
  const newNorm = normalize(compiledResult.systemPrompt)

  const similarity = lineSimilarity(legacyNorm, newNorm)
  const similarityPct = (similarity * 100).toFixed(1)

  console.log(`[PARITY TEST] Similaridade do systemPrompt: ${similarityPct}%`)

  if (similarity < 0.95) {
    console.error(
      `[PARITY TEST] FALHA — similaridade ${similarityPct}% abaixo do limiar de 95%.\n` +
        `Analise as linhas diferentes comparando as strings abaixo:\n`,
    )
    // Exibe primeiras 50 linhas divergentes para diagnóstico
    const linesLegacy = legacyNorm.split('\n')
    const linesNew = newNorm.split('\n')
    const maxLen = Math.max(linesLegacy.length, linesNew.length)
    let diffCount = 0

    for (let i = 0; i < maxLen && diffCount < 50; i++) {
      const lineL = linesLegacy[i] ?? '<ausente>'
      const lineN = linesNew[i] ?? '<ausente>'
      if (lineL !== lineN) {
        console.error(`  linha ${i + 1}:`)
        console.error(`    LEGADO: ${lineL}`)
        console.error(`    NOVO:   ${lineN}`)
        diffCount++
      }
    }

    process.exit(1)
  }

  console.log('[PARITY TEST] systemPrompt: OK')
  console.log('[PARITY TEST] Todos os checks passaram.')
  process.exit(0)
}

run().catch((err) => {
  console.error('[PARITY TEST] Erro inesperado:', err)
  process.exit(1)
})
