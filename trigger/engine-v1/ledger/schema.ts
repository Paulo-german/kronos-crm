import { z } from 'zod'

// O ledger (AgentSession.state) — belief state estruturado da conversa. Na Fase 1a só
// `attributes` (fatos capturados) + `control` (sinais conversacionais). `scheduling` e
// `committed` entram na Fase 2 (ver PLAN "Schema do ledger — RESOLVIDO").

// Um fato observado sobre um campo. `value` é a string canônica; a NATUREZA da resposta
// (não só o valor) é o que faz o gate funcionar como conversa (Fase 1b).
export const observedSchema = z.object({
  value: z.string(),
  nature: z.enum(['provided', 'deferred', 'refused', 'evasive']),
  polarity: z.enum(['positive', 'negative', 'neutral']),
  askedAtTurns: z.array(z.number()).default([]),
  observedAtTurn: z.number(),
  source: z.enum(['extracted', 'seeded', 'confirmed']),
})
export type Observed = z.infer<typeof observedSchema>

// `attributes` = MAPA CORRENTE (fieldKey → observed): 1 valor por atributo, sobrescreve
// (atributo é destino-CRM, histórico não importa). `control` = sinais conversacionais.
export const agentSessionStateSchema = z.object({
  attributes: z.record(z.string(), observedSchema).default({}),
  control: z.object({ handoffRequested: z.boolean().optional() }).optional(),
})
export type AgentSessionState = z.infer<typeof agentSessionStateSchema>

// Parse defensivo do JSON do banco → fail-open pra estado vazio se inválido (nunca
// derruba o turno por ledger corrompido).
export function parseSessionState(raw: unknown): AgentSessionState {
  const parsed = agentSessionStateSchema.safeParse(raw)
  return parsed.success ? parsed.data : { attributes: {} }
}
