import { z } from 'zod'
import type { ModelMessage as AISDKModelMessage } from 'ai'
import { ConnectionType } from '@prisma/client'
import type { ToolContext } from '../tools/types'

// Mensagem genérica de fallback seguro — usada quando nenhuma resposta pode ser
// gerada sem risco de alucinação ou violação de guardrail.
export const GENERIC_SAFE_FALLBACK =
  'Vou te retornar em instantes, um atendente vai continuar por aqui!'

// Schema de ModelMessage compatível com AI SDK v6.
// Usa z.custom<AISDKModelMessage>() para que o tipo inferido pelo Zod seja
// exatamente o `ModelMessage` do SDK (union discriminada por role). A
// validação runtime é intencionalmente permissiva — duplicar as uniões
// rigorosas do SDK em schemas Zod seria frágil entre upgrades do pacote.
// O SDK ainda faz validação estruturada ao receber as messages em
// generateText/generateObject.
export const modelMessageSchema = z.custom<AISDKModelMessage>((val) => {
  if (typeof val !== 'object' || val === null) return false
  const candidate = val as Record<string, unknown>
  if (typeof candidate.role !== 'string') return false
  const content = candidate.content
  return typeof content === 'string' || Array.isArray(content)
})

export type ModelMessage = AISDKModelMessage

// Schema interno do provider WhatsApp — espelha InboxProviderContext de tools/types.ts
const inboxProviderContextSchema = z.object({
  connectionType: z.nativeEnum(ConnectionType),
  evolutionInstanceName: z.string().nullable(),
  evolutionApiUrl: z.string().nullable(),
  evolutionApiKey: z.string().nullable(),
  metaPhoneNumberId: z.string().nullable(),
  metaAccessToken: z.string().nullable(),
  zapiInstanceId: z.string().nullable(),
  zapiToken: z.string().nullable(),
  zapiClientToken: z.string().nullable(),
})

// Schema Zod do contexto de execução das tools. Validado na fronteira de cada
// subtask (Agent 1 e Agent 2). O `satisfies` garante sincronia com a interface
// ToolContext: se um campo for adicionado em tools/types.ts, o build quebra aqui
// antes de chegar em produção.
export const toolContextSchema = z.object({
  organizationId: z.string().uuid(),
  agentId: z.string().uuid(),
  agentName: z.string(),
  conversationId: z.string().uuid(),
  contactId: z.string().uuid(),
  dealId: z.string().uuid().nullable(),
  pipelineIds: z.array(z.string().uuid()),
  remoteJid: z.string().nullable(),
  inboxProvider: inboxProviderContextSchema.nullable(),
}) satisfies z.ZodType<ToolContext>

// Canal ÚNICO entre os dois agentes. Contém somente dados factuais que
// vieram de tools e que o Agente 2 precisaria inventar se não os recebesse.
// REGRA DE OURO: "o Agente 2 precisaria mentir para responder sem este dado?"
// Se sim → campo entra. Se não → fica apenas em telemetria (ToolAgentTrace).
//
// O que NÃO entra aqui (decisão arquitetural):
// - `intent` ditada pelo Agent 1 — criaria hierarquia entre agentes
// - `internalActionsPerformed` (ex: move_deal, update_contact) — vai para log via phaseTraceId
// - Qualquer campo que o Agent 2 possa inferir do histórico de mensagens
export interface ToolDataForResponder {
  // Horários reais devolvidos por list_availability (sem eles o Agente 2
  // inventaria datas).
  availableSlots?: Array<{
    date: string // ISO (YYYY-MM-DD)
    startTime: string // HH:mm
    endTime: string // HH:mm
  }>

  // Confirmação factual de agendamento persistido (create_event/update_event).
  // Sem este dado o Agente 2 não saberia confirmar com segurança.
  appointmentConfirmed?: {
    id: string
    operation: 'created' | 'updated'
    startDate: string // ISO 8601
    endDate: string // ISO 8601
    title?: string
  }

  // Produtos reais retornados por search_products. O Agente 2 não pode
  // inventar nome/preço/descrição. Inclui media[] com URLs reais de
  // imagens/vídeos/documentos do produto (join com ProductMedia no banco).
  // O Agente 2 posiciona essas URLs inline no texto onde fizer sentido
  // narrativo — a camada de transporte parseia e envia como mídia.
  products?: Array<{
    id: string
    name: string
    price?: number
    shortDescription?: string
    media?: Array<{
      url: string
      type: 'image' | 'video' | 'document'
      label?: string
    }>
  }>

  // Trechos reais de base de conhecimento retornados por search_knowledge.
  // Knowledge snippets chegam EXCLUSIVAMENTE via Agent 2 (não Agent 1).
  knowledgeSnippets?: Array<{ title?: string; content: string }>

  // URLs de mídia avulsa extraídas de search_knowledge (chunks com links para
  // imagens, vídeos ou documentos). Permite ao Agente 2 referenciar mídia da
  // KB sem inventar URLs.
  mediaUrls?: Array<{
    url: string
    type: 'image' | 'video' | 'document'
    label?: string
  }>

  // Sinalização estruturada de falha. O campo `tool` contém o nome interno
  // da tool e NÃO é repassado ao prompt do Agent 2 — apenas serializado de
  // forma filtrada pelo formatDataFromTools. `recoverable:false` + topic
  // crítico aciona handoff educado.
  errors?: Array<{
    tool: string // nome interno — filtrado antes de chegar ao prompt do Agent 2
    topic: 'scheduling' | 'products' | 'knowledge' | 'crm' | 'other'
    reason: string // razão curta em PT-BR neutro (ex: "agenda indisponível")
    recoverable: boolean
    suggestedFallback?: string // hint para o Agent 2 pivotar (ex: "peça ao cliente para sugerir horário")
  }>

  // TRUE quando erro permanente atingiu tool crítica de venda (ex: agendamento
  // sem permissão, calendar provider desconectado, FK do deal inexistente).
  // O Agent 2 recebe este flag e transfere educadamente ao humano.
  requiresHumanHandoff?: boolean
}

// Schema Zod correspondente a ToolDataForResponder — usado para validação no
// payload dos subtasks na fronteira de entrada do Agent 2 e Agent 3.
export const toolDataForResponderSchema = z.object({
  availableSlots: z
    .array(
      z.object({
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      }),
    )
    .optional(),
  appointmentConfirmed: z
    .object({
      id: z.string(),
      operation: z.enum(['created', 'updated']),
      startDate: z.string(),
      endDate: z.string(),
      title: z.string().optional(),
    })
    .optional(),
  products: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().optional(),
        shortDescription: z.string().optional(),
        media: z
          .array(
            z.object({
              url: z.string(),
              type: z.enum(['image', 'video', 'document']),
              label: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
  knowledgeSnippets: z
    .array(
      z.object({
        title: z.string().optional(),
        content: z.string(),
      }),
    )
    .optional(),
  mediaUrls: z
    .array(
      z.object({
        url: z.string(),
        type: z.enum(['image', 'video', 'document']),
        label: z.string().optional(),
      }),
    )
    .optional(),
  errors: z
    .array(
      z.object({
        tool: z.string(),
        topic: z.enum(['scheduling', 'products', 'knowledge', 'crm', 'other']),
        reason: z.string(),
        recoverable: z.boolean(),
        suggestedFallback: z.string().optional(),
      }),
    )
    .optional(),
  requiresHumanHandoff: z.boolean().optional(),
}) satisfies z.ZodType<ToolDataForResponder>

// Telemetria interna do Agent 1 — vai para logs/Langfuse, NUNCA para o Agent 2.
// Separação por construção: o payload do subtask Agent 2 jamais recebe este objeto.
// `phaseTraceId` é UUID v4 para correlação nos logs do Trigger.dev.
// O distributed tracing do Langfuse usa campos separados (langfuseTraceId,
// langfuseParentSpanId) nos payloads dos subtasks — não conflita com este campo.
export interface ToolAgentTrace {
  phaseTraceId: string
  toolCalls: Array<{
    toolName: string
    toolCallId: string
    input: unknown
    success: boolean
    durationMs: number
    errorClass?: 'transient' | 'permanent'
    attempts?: number // preenchido quando houver retry.onThrow
  }>
  stepsUsed: number
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  rawText: string // descartado do caminho de resposta; útil apenas para debug
  inferredStepOrder: number | null // step do funil conversacional inferido pelo Agent 1; null = sem confiança suficiente
  classifiedStepId: string | null // UUID do step inferido pelo Agent 1; null = sem confiança/funil vazio
}

// Output do Agent 2 (Response Agent) — mensagem final ao cliente + metadados de uso.
// `knowledgeQueried` sinaliza se o Agent 2 chamou search_knowledge durante a resposta.
export interface ResponseAgentResult {
  customerMessage: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  knowledgeQueried?: boolean
}

// Output do Agent 3 (Leak Guardrail) — resultado da inspeção de vazamento de
// informação interna. `sanitized` presente apenas quando `hasLeak: true`.
// `confidence` varia de 0 (nenhuma certeza) a 1 (certeza absoluta).
export interface LeakGuardrailResult {
  hasLeak: boolean
  leakType?: 'tool_name' | 'internal_id' | 'system_prompt' | 'reasoning_trace'
  sanitized?: string
  confidence: number
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

// Contexto mínimo para o helper triggerHumanHandoff — aciona transferência
// para atendimento humano quando Agent 2 recebe requiresHumanHandoff:true.
export interface TriggerHumanHandoffCtx {
  conversationId: string
  organizationId: string
  reason: string
  phaseTraceId: string
}
