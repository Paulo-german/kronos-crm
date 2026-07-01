import type { AgentMode } from '@prisma/client'
import type { PromptConfig } from '@/_actions/agent/shared/prompt-config-schema'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'

// Uma etapa do funil, no formato que o compilador do engine consome. Anatomia enxuta
// (structured authoring): campos semânticos com propósito único, sem o legado do AgentStep.
export interface EngineStep {
  id: string
  name: string
  goal: string // objetivo: 1 frase (substitui o "balde" objective)
  order: number
  keyQuestion: string | null
  guidanceNote: string | null // observação de abordagem — escape hatch de texto livre
  messageExamples: string[] // few-shot de estilo da etapa (injetado só na etapa atual)
  actions: StepAction[]
}

// === Os 3 eixos do contexto, separados por CADÊNCIA DE MUDANÇA ===

// Perfil do agente — muda só quando o dono edita o agente. Estático → cacheável por agentId.
export interface AgentProfile {
  agentName: string
  modelId: string
  agentMode: AgentMode
  systemPromptRaw: string
  promptConfig: PromptConfig | null
  timezone: string
  steps: EngineStep[]
  pipelineIds: string[]
}

// Capacidades — KB (por agente) + produtos/serviços ativos (por org). Mudam raro.
// Estático → cacheável (invalida quando KB do agente / produtos / serviços mudam).
export interface Capabilities {
  hasKnowledgeBase: boolean
  hasActiveProducts: boolean
  hasActiveProductsWithMedia: boolean
  hasActiveServicesWithProfessionals: boolean
}

// Produto/serviço dentro de uma negociação aberta — pro briefing dizer O QUE se negocia.
export interface DealLineItem {
  name: string
  quantity: number
}

// Negociação aberta do contato — fatos que o código já extraiu (não dump cru).
export interface OpenDeal {
  title: string
  stageName: string
  value: string // Decimal serializado (formatação fica no compilador)
  products: DealLineItem[]
}

// Estado da conversa — dinâmico, sempre fresco. Fatos JÁ DIGERIDOS pelo código:
// negociações abertas do contato + se há agendamento. O compilador transforma em prosa.
export interface ConversationState {
  contactId: string
  contactName: string | null
  dealId: string | null // vínculo da conversa com a negociação (deal já existe via autoCreateDeal)
  openDeals: OpenDeal[]
  nextMeeting: {
    title: string
    whenIso: string
    serviceName: string | null
  } | null
  summary: string | null // memória comprimida da conversa (infra neutra)
  currentStepId: string | null // ponteiro da etapa atual (fonte: AgentSession); null = início
}

// Tudo que o compilador de prompt do engine precisa, modelado pelo eixo de mudança.
// Enxuto: sem globalTools, sem groupContext (single-agent na 1.0), sem recentToolEvents.
export interface EngineContext {
  profile: AgentProfile
  capabilities: Capabilities
  conversation: ConversationState
  nowIso: string // injetado (determinismo / testabilidade do compile)
}
