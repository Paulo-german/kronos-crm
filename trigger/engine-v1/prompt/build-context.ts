import { z } from 'zod'
import { promptConfigSchema } from '@/_actions/agent/shared/prompt-config-schema'
import { stepActionSchema } from '@/_actions/agent/shared/step-action-schema'
import { db } from '@/_lib/prisma'
import type {
  AgentProfile,
  Capabilities,
  ConversationState,
  EngineStep,
  OpenDeal,
} from './context'

// Carregadores do contexto do prompt, separados pelos 3 eixos de cadência de mudança.
// São I/O puros (queries próprias contra o schema — anel neutro, zero acoplamento aos
// compiladores single). O `load` orquestra os 3 + sessão + histórico numa rodada só e
// monta o EngineContext (o currentStepOrder vem da sessão, injetado lá).

// --- Perfil do agente (estático: muda só ao editar o agente) ---
// TODO(cache): envolver em unstable_cache por tag `agent-profile:${agentId}`,
// invalidada nas actions de editar agente/steps. Desligado até o motor rodar fim-a-fim.
export async function loadAgentProfile(agentId: string): Promise<AgentProfile> {
  const agent = await db.agent.findUniqueOrThrow({
    where: { id: agentId },
    select: {
      name: true,
      systemPrompt: true,
      promptConfig: true,
      modelId: true,
      agentMode: true,
      pipelineIds: true,
      businessHoursTimezone: true,
      agentEngineSteps: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          goal: true,
          order: true,
          keyQuestion: true,
          guidanceNote: true,
          messageExamples: true,
          actions: true,
        },
      },
    },
  })

  const steps: EngineStep[] = agent.agentEngineSteps.map((step) => ({
    id: step.id,
    name: step.name,
    goal: step.goal,
    order: step.order,
    keyQuestion: step.keyQuestion,
    guidanceNote: step.guidanceNote,
    messageExamples: step.messageExamples,
    actions: z.array(stepActionSchema).safeParse(step.actions).data ?? [],
  }))

  const promptConfig = promptConfigSchema.safeParse(agent.promptConfig)

  return {
    agentName: agent.name,
    modelId: agent.modelId,
    agentMode: agent.agentMode,
    systemPromptRaw: agent.systemPrompt,
    promptConfig: promptConfig.success ? promptConfig.data : null,
    timezone: agent.businessHoursTimezone,
    steps,
    pipelineIds: agent.pipelineIds,
  }
}

// --- Capacidades (estático: KB do agente + produtos/serviços ativos da org) ---
// TODO(cache): unstable_cache invalidado quando KB do agente / produtos / serviços
// mudam. Desligado por ora (cache entra após o motor rodar fim-a-fim).
export async function loadCapabilities(
  agentId: string,
  organizationId: string,
): Promise<Capabilities> {
  const [completedFileCount, productMediaCount, productCount, serviceCount] =
    await Promise.all([
      db.agentKnowledgeFile.count({ where: { agentId, status: 'COMPLETED' } }),
      db.product.count({
        where: { organizationId, isActive: true, media: { some: {} } },
      }),
      db.product.count({ where: { organizationId, isActive: true } }),
      db.service.count({
        where: {
          organizationId,
          isActive: true,
          professionalServices: {
            some: { professional: { workingHours: { some: {} } } },
          },
        },
      }),
    ])

  return {
    hasKnowledgeBase: completedFileCount > 0,
    hasActiveProducts: productCount > 0,
    hasActiveProductsWithMedia: productMediaCount > 0,
    hasActiveServicesWithProfessionals: serviceCount > 0,
  }
}

// --- Estado da conversa (dinâmico: a cada turno, nunca cacheado) ---
// O código pré-digere a situação comercial: negociações abertas do contato (com o que
// se negocia) + se já existe agendamento. O agente recebe o fato pronto, não uma tabela
// pra inferir. SEM currentStepOrder: ele vem da AgentSession (o load injeta na montagem),
// então esta query não depende da sessão e roda em paralelo com ela.
export async function loadConversationState(
  conversationId: string,
  now: Date,
): Promise<ConversationState> {
  const conversation = await db.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: {
      contactId: true,
      dealId: true,
      contact: { select: { name: true } },
    },
  })

  const deals = await db.deal.findMany({
    where: {
      status: 'OPEN',
      contacts: { some: { contactId: conversation.contactId } },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      title: true,
      value: true,
      stage: { select: { name: true } },
      dealProducts: {
        select: { quantity: true, product: { select: { name: true } } },
      },
      appointments: {
        where: { status: 'SCHEDULED', startDate: { gte: now } },
        orderBy: { startDate: 'asc' },
        select: {
          title: true,
          startDate: true,
          service: { select: { name: true } },
        },
      },
    },
  })

  const openDeals: OpenDeal[] = deals.map((deal) => ({
    title: deal.title,
    stageName: deal.stage.name,
    value: deal.value.toString(),
    products: deal.dealProducts.map((line) => ({
      name: line.product.name,
      quantity: line.quantity,
    })),
  }))

  // Próximo compromisso entre todas as negociações abertas (o mais cedo) — responde
  // "o lead já agendou?" sem o agente ter que vasculhar.
  const upcomingAppointments = deals
    .flatMap((deal) => deal.appointments)
    .sort(
      (first, second) => first.startDate.getTime() - second.startDate.getTime(),
    )
  const earliest = upcomingAppointments[0]
  const nextMeeting = earliest
    ? {
        title: earliest.title,
        whenIso: earliest.startDate.toISOString(),
        serviceName: earliest.service?.name ?? null,
      }
    : null

  return {
    contactId: conversation.contactId,
    contactName: conversation.contact.name,
    dealId: conversation.dealId,
    openDeals,
    nextMeeting,
    // Sem resumo lossy no engine: a janela crua (buildMessages) é a memória na 1.0;
    // o ledger estruturado assume em 1a. A sessão do engine nasce do zero.
    summary: null,
  }
}
