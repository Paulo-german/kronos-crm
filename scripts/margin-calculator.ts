#!/usr/bin/env tsx
/**
 * Calculadora de margem por modelo — baseada em dados reais do OpenRouter.
 *
 * Uso:
 *   pnpm tsx scripts/margin-calculator.ts --model google/gemini-2.5-pro --tokens 6200 --cost 0.0045
 *   pnpm tsx scripts/margin-calculator.ts --tpc 280 --tokens 6200 --cost 0.0045 --rate 5.80
 *
 * Parâmetros:
 *   --model   ID do modelo (ex: google/gemini-2.5-pro). Alternativa ao --tpc.
 *   --tpc     tokensPerCredit manual — útil para testar valores hipotéticos sem alterar o código.
 *   --tokens  Total de tokens consumidos na interação de amostra (input + output do log OpenRouter).
 *   --cost    Custo real cobrado pelo OpenRouter nessa interação (em USD, ex: 0.004200).
 *   --rate    Taxa de câmbio BRL/USD (padrão: 5.70).
 */

const args = process.argv.slice(2)

function arg(name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}

// ─── Modelos ─────────────────────────────────────────────────────────────────
// Hardcoded para o script ser autossuficiente (sem dependência de alias de path).
// Manter sincronizado com app/_lib/ai/models.ts quando alterar tokensPerCredit.

const MODELS: Record<string, { label: string; tokensPerCredit: number }> = {
  'openai/gpt-5.2':           { label: 'GPT 5.2',          tokensPerCredit: 220  },
  'google/gemini-2.5-pro':    { label: 'Gemini 2.5 Pro',   tokensPerCredit: 280  },
  'anthropic/claude-sonnet-4':{ label: 'Claude Sonnet 4',  tokensPerCredit: 200  },
  'openai/gpt-5.4-mini':      { label: 'GPT 5.4 Mini',     tokensPerCredit: 650  },
  'google/gemini-2.5-flash':  { label: 'Gemini 2.5 Flash', tokensPerCredit: 1200 },
  'openai/gpt-4.1-mini':      { label: 'GPT 4.1 Mini',     tokensPerCredit: 1700 },
  'openai/gpt-4o-mini':       { label: 'GPT-4o Mini',      tokensPerCredit: 4000 },
}

// ─── Planos ───────────────────────────────────────────────────────────────────
// Fonte: app/_lib/billing/plans-data.ts + prisma/seed.ts (ai.monthly_credits)

const PLANS = [
  { name: 'Light',      priceR: 147,  credits: 10_000 },
  { name: 'Essential',  priceR: 397,  credits: 18_000 },
  { name: 'Scale',      priceR: 697,  credits: 45_000 },
  { name: 'Enterprise', priceR: 1197, credits: 72_000 },
]

// ─── Args ─────────────────────────────────────────────────────────────────────

const modelId   = arg('model')
const tpcRaw    = arg('tpc')
const tokensRaw = arg('tokens')
const costRaw   = arg('cost')
const rateRaw   = arg('rate')

if (!tokensRaw || !costRaw) {
  console.error('\nUso: pnpm tsx scripts/margin-calculator.ts --model <id> --tokens <n> --cost <usd> [--rate <brl-usd>]')
  console.error('     pnpm tsx scripts/margin-calculator.ts --tpc <n>  --tokens <n> --cost <usd> [--rate <brl-usd>]')
  console.error('\nModelos disponíveis:')
  for (const [id, m] of Object.entries(MODELS)) {
    console.error(`  ${id.padEnd(32)} tokensPerCredit: ${m.tokensPerCredit}`)
  }
  process.exit(1)
}

const tokens   = Number(tokensRaw)
const costUsd  = Number(costRaw)
const usdToBrl = rateRaw ? Number(rateRaw) : 5.70

let modelLabel: string
let tokensPerCredit: number

if (tpcRaw) {
  tokensPerCredit = Number(tpcRaw)
  modelLabel      = modelId ? (MODELS[modelId]?.label ?? modelId) : `tokensPerCredit=${tokensPerCredit}`
} else if (modelId) {
  const model = MODELS[modelId]
  if (!model) {
    console.error(`\nModelo não encontrado: ${modelId}`)
    console.error('Disponíveis:', Object.keys(MODELS).join(', '))
    process.exit(1)
  }
  tokensPerCredit = model.tokensPerCredit
  modelLabel      = model.label
} else {
  console.error('\nInforme --model ou --tpc.')
  process.exit(1)
}

if (isNaN(tokens) || tokens <= 0)   { console.error('--tokens deve ser um número positivo'); process.exit(1) }
if (isNaN(costUsd) || costUsd <= 0) { console.error('--cost deve ser um número positivo'); process.exit(1) }

// ─── Cálculo ──────────────────────────────────────────────────────────────────

const creditsPerInteraction = Math.ceil(tokens / tokensPerCredit)
const costPerCredit         = costUsd / creditsPerInteraction

// ─── Output ───────────────────────────────────────────────────────────────────

const R  = (s: string, w: number) => s.padStart(w)
const L  = (s: string, w: number) => s.padEnd(w)
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const usd = (n: number) => `$${n.toFixed(4)}`
const brl = (n: number) => `R$${n.toFixed(2)}`

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Modelo:              ${modelLabel}
  Tokens na amostra:   ${tokens.toLocaleString('pt-BR')}
  Custo OpenRouter:    ${usd(costUsd)}
  tokensPerCredit:     ${tokensPerCredit}
  Créditos/interação:  ${creditsPerInteraction}
  Custo/crédito (API): ${usd(costPerCredit)}
  Taxa câmbio:         R$${usdToBrl}/USD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

const COLS = { plan: 12, credits: 10, inter: 11, api: 14, rev: 14, margin: 10, obs: 0 }

const header = [
  L('Plano', COLS.plan),
  R('Créditos', COLS.credits),
  R('Interact.', COLS.inter),
  R('Custo API (USD)', COLS.api),
  R('Receita (USD)', COLS.rev),
  R('Margem', COLS.margin),
].join('  ')

console.log(header)
console.log('─'.repeat(header.length))

for (const plan of PLANS) {
  const interactions = Math.floor(plan.credits / creditsPerInteraction)
  const apiCostUsd   = costUsd * interactions
  const revenueUsd   = plan.priceR / usdToBrl
  const marginUsd    = revenueUsd - apiCostUsd
  const marginPct    = (marginUsd / revenueUsd) * 100
  const warning      = marginPct < 0 ? ' ⚠ NEGATIVO' : marginPct < 20 ? ' ⚑ baixo' : ''

  const row = [
    L(plan.name, COLS.plan),
    R(plan.credits.toLocaleString('pt-BR'), COLS.credits),
    R(interactions.toLocaleString('pt-BR'), COLS.inter),
    R(usd(apiCostUsd), COLS.api),
    R(usd(revenueUsd), COLS.rev),
    R(pct(marginPct), COLS.margin),
  ].join('  ') + warning

  console.log(row)
}

console.log(`
Notas:
  • Receita = mensalidade BRL convertida pela taxa informada (não inclui custos fixos).
  • Custo API = custo de servir TODAS as interações possíveis com os créditos do plano.
  • Margem negativa = modelo muito barato para o tokensPerCredit configurado.
  • Use --tpc para simular valores sem alterar o código.
`)
