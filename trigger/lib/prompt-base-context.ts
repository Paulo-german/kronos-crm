import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { promptConfigSchema } from '@/_actions/agent/shared/prompt-config-schema'
import { stepActionSchema } from '@/_actions/agent/shared/step-action-schema'

// ---------------------------------------------------------------------------
// Sub-schemas serializable — sem Decimal, sem Date, sem Buffer.
// Builders do Lote 3 formatam com Intl a partir destes valores primitivos.
// ---------------------------------------------------------------------------

const contactContextSchema = z.object({
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  role: z.string().nullable(),
})

const dealContactSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.string().nullable(),
})

const dealProductSchema = z.object({
  productName: z.string(),
  quantity: z.number().int(),
  // Decimal.toString() — preserva precisão fiscal; builders convertem via Intl
  unitPrice: z.string(),
  discountType: z.enum(['percentage', 'fixed']).nullable(),
  discountValue: z.string(),
})

const dealTaskSchema = z.object({
  title: z.string(),
  dueDateIso: z.string(), // Date.toISOString()
  type: z.string(),
})

const dealAppointmentSchema = z.object({
  title: z.string(),
  startDateIso: z.string(), // Date.toISOString()
  endDateIso: z.string(),
})

const dealContextSchema = z.object({
  title: z.string(),
  status: z.string(),
  priority: z.string(),
  stageName: z.string(),
  value: z.string(), // Decimal.toString()
  companyName: z.string().nullable(),
  expectedCloseDateIso: z.string().nullable(), // Date.toISOString() | null
  notes: z.string().nullable(),
  contacts: z.array(dealContactSchema),
  products: z.array(dealProductSchema),
  tasks: z.array(dealTaskSchema),
  appointments: z.array(dealAppointmentSchema),
})

// Mantido 1:1 com o schema existente em app/_actions/agent/shared/step-action-schema.ts
const agentStepSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  objective: z.string(),
  order: z.number().int(),
  actions: z.array(stepActionSchema),
  keyQuestion: z.string().nullable(),
  messageTemplate: z.string().nullable(),
})

const toolEventSchema = z.object({
  type: z.enum(['TOOL_SUCCESS', 'TOOL_FAILURE']),
  content: z.string(),
  // Achatado de metadata.subtype (JSONB) — evita z.unknown() na fronteira do payload
  subtype: z.string().nullable(),
  createdAtIso: z.string(), // Date.toISOString()
})

const groupContextSchema = z.object({
  groupId: z.string().uuid(),
  currentAgentId: z.string().uuid(),
  workers: z.array(
    z.object({
      agentId: z.string().uuid(),
      name: z.string(),
      scopeLabel: z.string(),
    }),
  ),
})

// ---------------------------------------------------------------------------
// Schema principal — snapshot JSON-serializable construído uma vez no
// orchestrator e passado via payload para os 3 subtasks.
// ---------------------------------------------------------------------------

export const promptBaseContextSchema = z.object({
  // Identidade do agente
  agentId: z.string().uuid(),
  agentName: z.string(),
  agentVersion: z.enum(['v1', 'v2']),
  modelId: z.string(),

  // Persona configurada
  promptConfig: promptConfigSchema.nullable(),
  systemPromptRaw: z.string(),

  // Funil completo (fonte única de verdade para os builders §1.9.2 A-I)
  steps: z.array(agentStepSchema),

  // Entidades CRM
  contact: contactContextSchema,
  deal: dealContextSchema.nullable(),

  // Flags de capacidade — ligam/desligam seções do system prompt nos builders
  hasKnowledgeBase: z.boolean(),
  hasActiveProducts: z.boolean(),
  hasActiveProductsWithMedia: z.boolean(),

  // Snapshot determinístico de eventos de tool — retry re-usa exatamente os mesmos dados
  recentToolEvents: z.array(toolEventSchema),

  // Motivos de perda disponíveis (relevante apenas quando update_deal está habilitado)
  lossReasonNames: z.array(z.string()),

  // Tools disponíveis — builders filtram conforme a "lente" do agente
  toolsEnabled: z.array(z.string()),

  // Grupo de agentes (transferência entre workers)
  groupContext: groupContextSchema.nullable(),

  // Step atual do funil — baseline lido do banco; Agent 1 pode inferir outro valor
  currentStepOrder: z.number().int().min(0),

  // Pipelines acessíveis — validação target para tools de CRM (move_deal, create_deal)
  pipelineIds: z.array(z.string().uuid()),

  // Momento único do build — ÚNICO ponto onde new Date() é chamado
  nowIso: z.string(),
  timezone: z.string(),
})

export type PromptBaseContext = z.infer<typeof promptBaseContextSchema>

// Tipo interno para o groupContext recebido pelo orchestrator como parâmetro
type GroupContext = z.infer<typeof groupContextSchema>

// ---------------------------------------------------------------------------
// buildPromptBaseContext
//
// Constrói o PromptBaseContext fazendo todas as queries Prisma necessárias e
// serializando para JSON-safe. Deve ser chamado UMA vez no orchestrator —
// subtasks recebem o resultado via payload e não fazem queries.
// ---------------------------------------------------------------------------

export async function buildPromptBaseContext(
  agentId: string,
  conversationId: string,
  organizationId: string,
  groupContext: GroupContext | null,
): Promise<PromptBaseContext> {
  // Snapshot de tempo chamado uma única vez — retry re-usa o mesmo nowIso
  const nowIso = new Date().toISOString()
  const now = new Date(nowIso)

  const [
    agent,
    conversation,
    completedFileCount,
    lossReasons,
    recentToolEvents,
    activeProductMediaCount,
    activeProductCount,
  ] = await Promise.all([
    db.agent.findUniqueOrThrow({
      where: { id: agentId },
      select: {
        name: true,
        systemPrompt: true,
        promptConfig: true,
        modelId: true,
        agentVersion: true,
        pipelineIds: true,
        businessHoursTimezone: true,
        steps: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            objective: true,
            order: true,
            actions: true,
            keyQuestion: true,
            messageTemplate: true,
          },
        },
      },
    }),
    db.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: {
        currentStepOrder: true,
        contact: {
          select: {
            name: true,
            phone: true,
            email: true,
            role: true,
          },
        },
        deal: {
          select: {
            title: true,
            status: true,
            priority: true,
            value: true,
            notes: true,
            expectedCloseDate: true,
            stage: { select: { name: true } },
            company: { select: { name: true } },
            contacts: {
              select: {
                contact: {
                  select: { name: true, email: true, phone: true, role: true },
                },
              },
            },
            dealProducts: {
              select: {
                quantity: true,
                unitPrice: true,
                discountType: true,
                discountValue: true,
                product: { select: { name: true } },
              },
            },
            tasks: {
              where: { isCompleted: false },
              orderBy: { dueDate: 'asc' },
              take: 5,
              select: { title: true, dueDate: true, type: true },
            },
            appointments: {
              where: { status: 'SCHEDULED', startDate: { gte: now } },
              orderBy: { startDate: 'asc' },
              take: 3,
              select: { title: true, startDate: true, endDate: true },
            },
          },
        },
      },
    }),
    db.agentKnowledgeFile.count({
      where: { agentId, status: 'COMPLETED' },
    }),
    db.dealLostReason.findMany({
      where: { organizationId, isActive: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
    db.conversationEvent.findMany({
      where: {
        conversationId,
        type: { in: ['TOOL_SUCCESS', 'TOOL_FAILURE'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        type: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    }),
    db.product.count({
      where: {
        organizationId,
        isActive: true,
        media: { some: {} },
      },
    }),
    db.product.count({
      where: {
        organizationId,
        isActive: true,
      },
    }),
  ])

  // Derivar conjunto de tools ativas a partir das actions configuradas nos steps
  const allStepActions = agent.steps.flatMap((step) => {
    const parsed = z.array(stepActionSchema).safeParse(step.actions)
    return parsed.success ? parsed.data : []
  })

  const baseEffectiveTools = [...new Set(allStepActions.map((action) => action.type))]

  // update_event não é type de action — é ativado via allowReschedule no create_event
  const hasReschedulableEvent = allStepActions.some(
    (action) => action.type === 'create_event' && action.allowReschedule,
  )
  const schedulingTools: string[] = hasReschedulableEvent ? ['update_event'] : []

  // search_knowledge implícito quando há arquivos completos mas o step não declarou explicitamente
  const knowledgeTools: string[] =
    completedFileCount > 0 && !baseEffectiveTools.includes('search_knowledge')
      ? ['search_knowledge']
      : []

  const productSearchTools: string[] = activeProductCount > 0 ? ['search_products'] : []
  const productMediaTools: string[] = activeProductMediaCount > 0 ? ['send_product_media'] : []
  const mediaUrlTools: string[] = ['send_media']

  const toolsEnabled = [
    ...baseEffectiveTools,
    ...schedulingTools,
    ...knowledgeTools,
    ...productSearchTools,
    ...productMediaTools,
    ...mediaUrlTools,
  ]

  // Serializar steps — actions são Json no banco, precisam ser re-parseados
  const steps: PromptBaseContext['steps'] = agent.steps.map((step) => {
    const parsedActions = z.array(stepActionSchema).safeParse(step.actions)
    return {
      id: step.id,
      name: step.name,
      objective: step.objective,
      order: step.order,
      actions: parsedActions.success ? parsedActions.data : [],
      keyQuestion: step.keyQuestion ?? null,
      messageTemplate: step.messageTemplate ?? null,
    }
  })

  // Serializar contato — campos nullable preservados
  const contact: PromptBaseContext['contact'] = {
    name: conversation.contact.name,
    phone: conversation.contact.phone ?? null,
    email: conversation.contact.email ?? null,
    role: conversation.contact.role ?? null,
  }

  // Serializar deal (nullable) — Decimal→string, Date→ISO
  const deal: PromptBaseContext['deal'] = conversation.deal
    ? {
        title: conversation.deal.title,
        status: conversation.deal.status,
        priority: conversation.deal.priority,
        stageName: conversation.deal.stage.name,
        value: conversation.deal.value.toString(),
        companyName: conversation.deal.company?.name ?? null,
        expectedCloseDateIso: conversation.deal.expectedCloseDate
          ? conversation.deal.expectedCloseDate.toISOString()
          : null,
        notes: conversation.deal.notes ?? null,
        contacts: conversation.deal.contacts.map((dealContact) => ({
          name: dealContact.contact.name,
          email: dealContact.contact.email ?? null,
          phone: dealContact.contact.phone ?? null,
          role: dealContact.contact.role ?? null,
        })),
        products: conversation.deal.dealProducts.map((dealProduct) => ({
          productName: dealProduct.product.name,
          quantity: dealProduct.quantity,
          unitPrice: dealProduct.unitPrice.toString(),
          discountType: dealProduct.discountType as 'percentage' | 'fixed' | null,
          discountValue: dealProduct.discountValue.toString(),
        })),
        tasks: conversation.deal.tasks.map((task) => ({
          title: task.title,
          dueDateIso: task.dueDate.toISOString(),
          type: task.type,
        })),
        appointments: conversation.deal.appointments.map((appointment) => ({
          title: appointment.title,
          startDateIso: appointment.startDate.toISOString(),
          endDateIso: appointment.endDate.toISOString(),
        })),
      }
    : null

  // Serializar eventos de tool — achatar metadata.subtype para campo top-level tipado
  const serializedToolEvents: PromptBaseContext['recentToolEvents'] = recentToolEvents.map(
    (event) => {
      const meta = event.metadata as { subtype?: string } | null
      return {
        type: event.type as 'TOOL_SUCCESS' | 'TOOL_FAILURE',
        content: event.content,
        subtype: meta?.subtype ?? null,
        createdAtIso: event.createdAt.toISOString(),
      }
    },
  )

  // Parsear promptConfig (Json?) — fallback null quando inválido
  const parsedConfig = promptConfigSchema.safeParse(agent.promptConfig)
  const promptConfig = parsedConfig.success ? parsedConfig.data : null

  // Validar agentVersion — enum estrito; fallback para v1 se campo desconhecido
  const agentVersionRaw = agent.agentVersion
  const agentVersion: 'v1' | 'v2' = agentVersionRaw === 'v2' ? 'v2' : 'v1'

  return {
    agentId,
    agentName: agent.name,
    agentVersion,
    modelId: agent.modelId,
    promptConfig,
    systemPromptRaw: agent.systemPrompt,
    steps,
    contact,
    deal,
    hasKnowledgeBase: completedFileCount > 0,
    hasActiveProducts: activeProductCount > 0,
    hasActiveProductsWithMedia: activeProductMediaCount > 0,
    recentToolEvents: serializedToolEvents,
    lossReasonNames: lossReasons.map((reason) => reason.name),
    toolsEnabled,
    groupContext,
    currentStepOrder: conversation.currentStepOrder,
    pipelineIds: agent.pipelineIds,
    nowIso,
    timezone: agent.businessHoursTimezone,
  }
}
