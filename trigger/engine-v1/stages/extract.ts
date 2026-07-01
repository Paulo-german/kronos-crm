import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { extractAttributes } from '../extractor/extract-attributes'
import { mergeExtractedFields } from '../ledger/merge-attributes'
import { parseSessionState } from '../ledger/schema'
import type { Stage } from '../types'

// Quantas mensagens o extrator lê (janela menor que a do responder — foca no recente). O
// ledger corrente entra no prompt e cobre o que passou da janela, então 15 basta.
const EXTRACTOR_WINDOW = 15

// Extrator na frente (Forma 1): lê a conversa e escreve os fatos no ledger. Fase 1a =
// TELEMETRIA — só popula + loga, NÃO trava nem avança (isso é o gate, 1b). O generate
// ainda não usa o ledger; a ordem antes do generate já deixa a estrutura pronta pro 1b.
export const extract: Stage = async ({ ctx, session, messages }) => {
  if (!session || !messages) return {}

  // Campos que o agente coleta (todas as etapas). Na 1a, só source AGENT (fica no ledger,
  // não toca o CRM — os CUSTOM_FIELD entram na 1c).
  const stepFields = await db.agentEngineStepField.findMany({
    where: {
      agentEngineStep: { agentId: ctx.effectiveAgentId },
      source: 'AGENT',
    },
    select: { agentFieldKey: true },
  })
  const fieldKeys = [
    ...new Set(
      stepFields
        .map((field) => field.agentFieldKey)
        .filter((key): key is string => Boolean(key)),
    ),
  ]

  // Parseia o ledger ANTES: o extrator o recebe como contexto (deixa de ser amnésico) e
  // devolve só o delta; o merge é o juiz do que de fato mudou.
  const state = parseSessionState(session.state)
  const window = messages.slice(-EXTRACTOR_WINDOW)
  const result = await extractAttributes(window, fieldKeys, state)

  // Mescla no ledger — mapa corrente. O merge preserva o `observedAtTurn` original quando
  // o fato é reconfirmado idêntico (só avança o turno quando muda de verdade).
  mergeExtractedFields(state, result.fields, session.turnCount)
  if (result.handoffRequested) {
    state.control = { ...state.control, handoffRequested: true }
  }

  // Telemetria (1a): loga o que foi extraído pra avaliar o acerto no simulador.
  logger.info('[engine-v1 extract]', {
    conversationId: ctx.conversationId,
    extracted: result.fields.map(
      (field) =>
        `${field.key}=${field.value} (${field.nature}/${field.polarity})`,
    ),
    handoffRequested: result.handoffRequested,
  })

  return { sessionState: state }
}
