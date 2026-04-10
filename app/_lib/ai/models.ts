// Arquivo client-safe: zero imports do ai-sdk ou anything server-side.
// Permite que componentes client importem a lista canônica sem arrastar o SDK da Vercel AI.

export interface AiModel {
  id: string
  label: string
  description: string
  provider: 'openai' | 'google' | 'anthropic'
  tokensPerCredit: number
  availableFor: ReadonlyArray<'agent' | 'router'>
  // Para qual(is) picker(s) esse modelo deve ganhar badge "Recomendado".
  // É array porque um modelo pode aparecer em ambas as listas mas ser
  // recomendado só em uma (ex: Gemini 2.5 Flash é recomendado APENAS no router).
  recommendedFor?: ReadonlyArray<'agent' | 'router'>
}

export const AI_MODELS: ReadonlyArray<AiModel> = [
  {
    id: 'openai/gpt-5.2',
    label: 'GPT 5.2',
    description: 'Mais inteligente da OpenAI. Maior custo por mensagem.',
    provider: 'openai',
    tokensPerCredit: 350,
    availableFor: ['agent'],
  },
  {
    id: 'openai/gpt-4.1-mini',
    label: 'GPT 4.1 Mini',
    description: 'Rápido e econômico. Bom para tarefas simples.',
    provider: 'openai',
    tokensPerCredit: 1700,
    availableFor: ['agent', 'router'],
  },
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o Mini',
    description: 'Rápido e econômico. Ideal para classificação de rotas.',
    provider: 'openai',
    tokensPerCredit: 4500,
    availableFor: ['router'],
  },
  {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Alta capacidade do Google. Bom equilíbrio custo/qualidade.',
    provider: 'google',
    tokensPerCredit: 350,
    availableFor: ['agent'],
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Mais rápido e econômico do Google.',
    provider: 'google',
    tokensPerCredit: 4500,
    availableFor: ['agent', 'router'],
    recommendedFor: ['router'],
  },
  {
    id: 'anthropic/claude-sonnet-4',
    label: 'Claude Sonnet 4',
    description: 'Recomendado. Melhor equilíbrio entre inteligência e custo.',
    provider: 'anthropic',
    tokensPerCredit: 200,
    availableFor: ['agent', 'router'],
    recommendedFor: ['agent'],
  },
]

export const AGENT_MODELS: ReadonlyArray<AiModel> = AI_MODELS.filter((model) =>
  model.availableFor.includes('agent'),
)

export const ROUTER_MODELS: ReadonlyArray<AiModel> = AI_MODELS.filter((model) =>
  model.availableFor.includes('router'),
)

export const DEFAULT_AGENT_MODEL_ID = 'google/gemini-2.5-pro'
export const DEFAULT_ROUTER_MODEL_ID = 'google/gemini-2.5-flash'

// Fallback conservador para IDs legados fora da lista canônica.
// Menor = mais créditos cobrados por token = não subestima custo de execuções antigas.
// Mantém o mesmo valor (200) do antigo billing/model-pricing.ts para preservar comportamento.
const DEFAULT_TOKENS_PER_CREDIT = 200

export function getModelById(id: string): AiModel | undefined {
  return AI_MODELS.find((model) => model.id === id)
}

/**
 * Retorna label humano para exibição. Funciona para IDs históricos (fora da lista).
 * Fallback: último segmento do ID (ex: 'google/gemini-2.0-flash' → 'gemini-2.0-flash').
 * Retorna '—' para null/undefined (paridade com a versão local antiga do executions-list).
 */
export function getModelLabel(id: string | null | undefined): string {
  if (!id) return '—'
  return getModelById(id)?.label ?? id.split('/').pop() ?? id
}

export function isValidAgentModel(id: string): boolean {
  return AGENT_MODELS.some((model) => model.id === id)
}

export function isValidRouterModel(id: string): boolean {
  return ROUTER_MODELS.some((model) => model.id === id)
}

/**
 * Retorna tokensPerCredit do modelo. Fallback conservador para IDs legados:
 * evita subestimar custo de execuções históricas com modelos removidos da lista.
 */
export function getTokensPerCreditForModel(id: string): number {
  return getModelById(id)?.tokensPerCredit ?? DEFAULT_TOKENS_PER_CREDIT
}

// Tuplas literais declaradas à mão para preservar inferência literal do z.enum.
// ATENÇÃO: se adicionar/remover modelos em AI_MODELS, atualizar AMBAS as tuplas abaixo.
// O assertTuplesMatch no final deste arquivo detecta drift no boot.
export const AGENT_MODEL_IDS = [
  'openai/gpt-5.2',
  'openai/gpt-4.1-mini',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'anthropic/claude-sonnet-4',
] as const satisfies readonly [string, ...string[]]

export const ROUTER_MODEL_IDS = [
  'openai/gpt-4.1-mini',
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
  'anthropic/claude-sonnet-4',
] as const satisfies readonly [string, ...string[]]

// ---------------------------------------------------------------------------
// Runtime sanity check — falha imediatamente no boot se AGENT_MODEL_IDS ou
// ROUTER_MODEL_IDS divergirem do availableFor declarado em AI_MODELS.
//
// Por que existe: as tuplas são declaradas à mão (não derivadas) para preservar
// inferência literal do z.enum. Isso cria risco de drift — alguém adiciona um
// modelo em AI_MODELS mas esquece de incluir na tupla correspondente.
// Este check garante que o drift é detectado no boot, não em produção.
// ---------------------------------------------------------------------------
function assertTuplesMatch(
  role: 'agent' | 'router',
  declaredTuple: readonly string[],
): void {
  const expectedFromCanonical = AI_MODELS
    .filter((model) => model.availableFor.includes(role))
    .map((model) => model.id)
    .sort()
  const declared = [...declaredTuple].sort()

  const mismatch =
    expectedFromCanonical.length !== declared.length ||
    expectedFromCanonical.some((id, index) => id !== declared[index])

  if (mismatch) {
    throw new Error(
      `[ai-models] ${role.toUpperCase()}_MODEL_IDS out of sync with AI_MODELS.availableFor. ` +
        `Expected: [${expectedFromCanonical.join(', ')}]. ` +
        `Declared: [${declared.join(', ')}]. ` +
        `Fix: update models.ts so both lists match.`,
    )
  }
}

assertTuplesMatch('agent', AGENT_MODEL_IDS)
assertTuplesMatch('router', ROUTER_MODEL_IDS)
