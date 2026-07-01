import { generateObject, type ModelMessage } from 'ai'
import { z } from 'zod'
import { getModel } from '@/_lib/ai/provider'
import type { AgentSessionState } from '../ledger/schema'
import { AGENT_FIELD_CATALOG } from './field-catalog'

// Modelo dedicado do extrator: gpt-4o-mini (OpenAI, confiável p/ structured output).
// Aqui generateObject é o caso CERTO (extrair dados) — não o problema all-or-nothing da
// MENSAGEM (que é texto puro no responder). Barato e rápido.
const EXTRACTOR_MODEL_ID = 'openai/gpt-4o-mini'

const NATURE = ['provided', 'deferred', 'refused', 'evasive'] as const
const POLARITY = ['positive', 'negative', 'neutral'] as const

export interface ExtractedField {
  key: string
  value: string
  nature: (typeof NATURE)[number]
  polarity: (typeof POLARITY)[number]
}

export interface ExtractionResult {
  fields: ExtractedField[]
  handoffRequested: boolean
}

const EXTRACTOR_SYSTEM = `Você extrai fatos de uma conversa de atendimento comercial. Analise as mensagens e identifique quais dos campos listados o CLIENTE abordou.

Para cada campo que o cliente abordou, classifique:
- value: o valor informado, limpo e canônico (ex: "Honda Civic", "Niterói"). Vazio se não houver valor.
- nature:
  - "provided": informou o dado de fato.
  - "deferred": pediu EXPLICITAMENTE pra deixar pra depois, com sinal claro de adiamento ("te mando depois", "agora não tô com o documento", "quando chegar em casa"). Tem que haver a intenção declarada de responder mais tarde.
  - "refused": recusou dar a informação ("não quero dizer", "prefiro não informar").
  - "evasive": NÃO respondeu o que foi perguntado e NÃO sinalizou adiamento — mudou de assunto, fez OUTRA pergunta, ou ignorou. ATENÇÃO: fazer uma pergunta em vez de responder é "evasive", NUNCA "deferred". Só é "deferred" quando o cliente diz que responde depois.
- polarity: "positive" / "negative" / "neutral" — relevante quando nature="provided" (ex: "não tenho interesse" → negative).

Regras:
- Retorne SOMENTE os campos que o cliente realmente abordou. Ignore os não mencionados.
- Só marque um campo como "deferred"/"refused"/"evasive" se ele foi de fato PERGUNTADO ou trazido à tona nesta conversa. Não presuma adiamento/recusa de um campo que ninguém tocou — esse fica de fora.
- Baseie-se apenas no que o cliente disse, nunca invente.
- handoffRequested: true apenas se o cliente pediu EXPLICITAMENTE falar com um atendente humano.`

// Injeta o estado corrente do ledger no prompt. Sem isto o extrator é AMNÉSICO entre turnos:
// re-extrai do zero e esquece o que saiu da janela. Com o estado visível, ele (a) não perde
// fatos antigos (o ledger é o destilado do que passou da janela) e (b) retorna só o DELTA
// (novos/mudados). O merge (código determinístico) continua sendo o juiz final do que mudou —
// o LLM só sugere; se re-afirmar um fato idêntico, o merge absorve sem envelhecer o turno.
function formatKnownFacts(state: AgentSessionState): string {
  const entries = Object.entries(state.attributes)
  if (entries.length === 0) {
    return 'ESTADO ATUAL: nada capturado ainda. Extraia tudo o que o cliente abordar.'
  }

  const lines = entries.map(([key, observed]) =>
    observed.nature === 'provided'
      ? `- ${key} = "${observed.value}"`
      : `- ${key}: pendente (${observed.nature})`,
  )

  return `ESTADO ATUAL (fatos já capturados nesta conversa — você JÁ sabe disto):
${lines.join('\n')}

Retorne em \`fields\` APENAS o que a conversa ADICIONA ou MODIFICA em relação ao estado acima:
- campos NOVOS ainda não capturados;
- campos que MUDARAM (o cliente corrigiu o valor, ou mudou natureza/polaridade — ex.: adiou e agora respondeu).
Se um campo já conhecido continua igual, NÃO o inclua.`
}

// Extrai os atributos capturados na conversa (Forma 1: canal paralelo estruturado). Roda
// na frente, escreve o ledger. Sem campos definidos → no-op (nada a extrair). A janela já
// vem recortada pelo estágio; `currentState` é o ledger corrente (visto pelo extrator).
export async function extractAttributes(
  messages: ModelMessage[],
  fieldKeys: string[],
  currentState: AgentSessionState,
): Promise<ExtractionResult> {
  if (fieldKeys.length === 0) {
    return { fields: [], handoffRequested: false }
  }

  const catalogDoc = fieldKeys
    .map((key) => {
      const spec = AGENT_FIELD_CATALOG[key]
      return spec ? `- ${key}: ${spec.label} — ${spec.description}` : `- ${key}`
    })
    .join('\n')

  const schema = z.object({
    fields: z.array(
      z.object({
        key: z.enum(fieldKeys as [string, ...string[]]),
        value: z.string(),
        nature: z.enum(NATURE),
        polarity: z.enum(POLARITY),
      }),
    ),
    handoffRequested: z.boolean(),
  })

  const { object } = await generateObject({
    model: getModel(EXTRACTOR_MODEL_ID),
    schema,
    system: `${EXTRACTOR_SYSTEM}\n\nCampos a capturar:\n${catalogDoc}\n\n${formatKnownFacts(currentState)}`,
    messages,
    temperature: 0,
  })

  return { fields: object.fields, handoffRequested: object.handoffRequested }
}
