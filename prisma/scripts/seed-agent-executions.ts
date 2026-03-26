/**
 * Seed de teste para Agent Executions.
 *
 * Cria 6 execuções de exemplo (2 de cada cenário: COMPLETED, FAILED, SKIPPED)
 * com steps realistas que simulam o fluxo do process-agent-message.
 *
 * Pré-requisitos:
 *   - Banco migrado com tabelas agent_executions e agent_execution_steps
 *   - Um Agent + Conversation já existem no banco
 *
 * Execução:
 *   npx tsx prisma/scripts/seed-agent-executions.ts
 */

import { db } from '@/_lib/prisma'
import { Prisma } from '@prisma/client'
import type {
  AgentExecutionStepType,
  AgentExecutionStepStatus,
} from '@prisma/client'

interface StepData {
  type: AgentExecutionStepType
  status: AgentExecutionStepStatus
  toolName?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  durationMs?: number
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000)
}

async function main() {
  console.log('🔄 Seed: Agent Executions...\n')

  // -----------------------------------------------------------------------
  // 1. Buscar agent + conversation existentes
  // -----------------------------------------------------------------------
  const agent = await db.agent.findFirst({
    include: {
      organization: { select: { id: true, name: true } },
      inboxes: {
        where: { isActive: true },
        take: 1,
        select: { id: true },
      },
    },
  })

  if (!agent) {
    console.error('❌ Nenhum agent encontrado. Execute primeiro: npx tsx prisma/scripts/seed-ai-agent.ts')
    process.exit(1)
  }

  console.log(`  📌 Agent: ${agent.name} (${agent.id})`)
  console.log(`  📌 Org: ${agent.organization.name} (${agent.organization.id})`)

  // Buscar conversa existente na org OU criar uma de teste
  let conversation = await db.conversation.findFirst({
    where: { organizationId: agent.organizationId },
    select: { id: true, inboxId: true, contact: { select: { name: true } } },
  })

  if (!conversation) {
    // Precisa de uma inbox para criar conversa — buscar qualquer uma da org
    let inbox = await db.inbox.findFirst({
      where: { organizationId: agent.organizationId },
      select: { id: true },
    })

    if (!inbox) {
      inbox = await db.inbox.create({
        data: {
          organizationId: agent.organizationId,
          name: 'Inbox Seed',
          channel: 'WHATSAPP',
          isActive: true,
          agentId: agent.id,
        },
        select: { id: true },
      })
    }

    const contact = await db.contact.create({
      data: {
        organizationId: agent.organizationId,
        name: 'João Silva (Seed)',
        phone: '5511999990001',
      },
    })

    const conv = await db.conversation.create({
      data: {
        inboxId: inbox.id,
        organizationId: agent.organizationId,
        contactId: contact.id,
        channel: 'WHATSAPP',
        remoteJid: '5511999990001@s.whatsapp.net',
      },
      include: { contact: { select: { name: true } } },
    })
    conversation = { id: conv.id, inboxId: conv.inboxId, contact: conv.contact }
    console.log(`  📌 Conversa criada: ${conversation.id}`)
  } else {
    console.log(`  📌 Conversa: ${conversation.id} (${conversation.contact?.name ?? 'sem nome'})`)
  }

  const orgId = agent.organizationId
  const agentId = agent.id
  const conversationId = conversation.id

  // -----------------------------------------------------------------------
  // 2. Limpar execuções anteriores do seed
  // -----------------------------------------------------------------------
  const deleted = await db.agentExecution.deleteMany({
    where: { agentId, errorMessage: { startsWith: '[Seed]' } },
  })
  // Também limpar execuções sem o prefixo [Seed] para este agente (cenário de re-run)
  const deletedAll = await db.agentExecution.deleteMany({
    where: { agentId, triggerMessageId: { startsWith: 'seed-' } },
  })
  console.log(`  🧹 Limpou ${deleted.count + deletedAll.count} execuções anteriores do seed\n`)

  // -----------------------------------------------------------------------
  // 3. Cenário COMPLETED #1 — Fluxo completo com tool calls
  // -----------------------------------------------------------------------
  const completed1Steps: StepData[] = [
    { type: 'DEBOUNCE_CHECK', status: 'PASSED', durationMs: 12 },
    {
      type: 'CONTEXT_LOADING',
      status: 'PASSED',
      durationMs: 245,
      output: { model: 'google/gemini-2.5-pro', historyCount: 8, hasSummary: false },
    },
    {
      type: 'CREDIT_CHECK',
      status: 'PASSED',
      durationMs: 18,
      output: { estimatedCost: 45, estimatedInputTokens: 3200 },
    },
    {
      type: 'LLM_CALL',
      status: 'PASSED',
      durationMs: 2340,
      output: { inputTokens: 3180, outputTokens: 420 },
    },
    {
      type: 'TOOL_CALL',
      status: 'PASSED',
      toolName: 'update_contact',
      durationMs: 89,
      input: { name: 'João Silva', email: 'joao@empresa.com' },
      output: { success: true, message: 'Contato atualizado com sucesso' },
    },
    {
      type: 'TOOL_CALL',
      status: 'PASSED',
      toolName: 'move_deal',
      durationMs: 112,
      input: { targetStageId: 'stage-uuid-qualificacao' },
      output: { success: true, message: 'Deal movido para Qualificação' },
    },
    { type: 'PAUSE_CHECK', status: 'PASSED', durationMs: 5 },
    {
      type: 'SEND_MESSAGE',
      status: 'PASSED',
      durationMs: 430,
      output: { responseLength: 245, provider: 'evolution' },
    },
    {
      type: 'FOLLOW_UP_SCHEDULE',
      status: 'PASSED',
      durationMs: 15,
      output: { totalFollowUps: 2, firstDelayMinutes: 30 },
    },
    { type: 'MEMORY_COMPRESSION', status: 'SKIPPED', output: { reason: 'below_threshold' } },
  ]

  await createExecution({
    agentId,
    orgId,
    conversationId,
    triggerMessageId: 'seed-completed-1',
    status: 'COMPLETED',
    startedAt: minutesAgo(45),
    durationMs: 3280,
    modelId: 'google/gemini-2.5-pro',
    inputTokens: 3180,
    outputTokens: 420,
    creditsCost: 38,
    steps: completed1Steps,
  })
  console.log('  ✅ COMPLETED #1 — Fluxo completo com 2 tool calls (update_contact + move_deal)')

  // -----------------------------------------------------------------------
  // 4. Cenário COMPLETED #2 — Áudio + knowledge search + envio
  // -----------------------------------------------------------------------
  const completed2Steps: StepData[] = [
    { type: 'DEBOUNCE_CHECK', status: 'PASSED', durationMs: 8 },
    {
      type: 'AUDIO_TRANSCRIPTION',
      status: 'PASSED',
      durationMs: 1850,
      output: { length: 312 },
    },
    {
      type: 'CONTEXT_LOADING',
      status: 'PASSED',
      durationMs: 310,
      output: { model: 'anthropic/claude-sonnet-4', historyCount: 15, hasSummary: true },
    },
    {
      type: 'CREDIT_CHECK',
      status: 'PASSED',
      durationMs: 22,
      output: { estimatedCost: 62, estimatedInputTokens: 5100 },
    },
    {
      type: 'LLM_CALL',
      status: 'PASSED',
      durationMs: 3120,
      output: { inputTokens: 5050, outputTokens: 680 },
    },
    {
      type: 'TOOL_CALL',
      status: 'PASSED',
      toolName: 'search_knowledge',
      durationMs: 156,
      input: { query: 'política de reembolso prazo devolução' },
      output: { success: true, message: '3 trechos encontrados na base de conhecimento' },
    },
    { type: 'PAUSE_CHECK', status: 'PASSED', durationMs: 4 },
    {
      type: 'SEND_MESSAGE',
      status: 'PASSED',
      durationMs: 380,
      output: { responseLength: 520, provider: 'evolution' },
    },
    {
      type: 'FOLLOW_UP_SCHEDULE',
      status: 'SKIPPED',
      output: { reason: 'no_follow_ups_for_step' },
    },
    {
      type: 'MEMORY_COMPRESSION',
      status: 'PASSED',
      durationMs: 1420,
      output: { compressed: true },
    },
  ]

  await createExecution({
    agentId,
    orgId,
    conversationId,
    triggerMessageId: 'seed-completed-2',
    status: 'COMPLETED',
    startedAt: minutesAgo(30),
    durationMs: 7290,
    modelId: 'anthropic/claude-sonnet-4',
    inputTokens: 5050,
    outputTokens: 680,
    creditsCost: 58,
    steps: completed2Steps,
  })
  console.log('  ✅ COMPLETED #2 — Áudio transcrito + knowledge search + memory compression')

  // -----------------------------------------------------------------------
  // 5. Cenário FAILED #1 — Erro no LLM (timeout/rate limit)
  // -----------------------------------------------------------------------
  const failed1Steps: StepData[] = [
    { type: 'DEBOUNCE_CHECK', status: 'PASSED', durationMs: 10 },
    {
      type: 'CONTEXT_LOADING',
      status: 'PASSED',
      durationMs: 198,
      output: { model: 'google/gemini-2.5-pro', historyCount: 4, hasSummary: false },
    },
    {
      type: 'CREDIT_CHECK',
      status: 'PASSED',
      durationMs: 14,
      output: { estimatedCost: 35, estimatedInputTokens: 2400 },
    },
    {
      type: 'LLM_CALL',
      status: 'FAILED',
      durationMs: 30000,
      output: { reason: 'llm_error', error: 'Request timeout after 30000ms — model overloaded' },
    },
  ]

  await createExecution({
    agentId,
    orgId,
    conversationId,
    triggerMessageId: 'seed-failed-1',
    status: 'FAILED',
    startedAt: minutesAgo(20),
    durationMs: 30250,
    modelId: 'google/gemini-2.5-pro',
    inputTokens: 0,
    outputTokens: 0,
    creditsCost: 0,
    errorMessage: 'Request timeout after 30000ms — model overloaded',
    steps: failed1Steps,
  })
  console.log('  ❌ FAILED #1 — LLM timeout (30s) após 3 retries')

  // -----------------------------------------------------------------------
  // 6. Cenário FAILED #2 — Tool call falha (deal não encontrado)
  // -----------------------------------------------------------------------
  const failed2Steps: StepData[] = [
    { type: 'DEBOUNCE_CHECK', status: 'PASSED', durationMs: 9 },
    {
      type: 'CONTEXT_LOADING',
      status: 'PASSED',
      durationMs: 220,
      output: { model: 'google/gemini-2.5-flash', historyCount: 6, hasSummary: false },
    },
    {
      type: 'CREDIT_CHECK',
      status: 'PASSED',
      durationMs: 16,
      output: { estimatedCost: 28, estimatedInputTokens: 1900 },
    },
    {
      type: 'LLM_CALL',
      status: 'PASSED',
      durationMs: 1850,
      output: { inputTokens: 1880, outputTokens: 310 },
    },
    {
      type: 'TOOL_CALL',
      status: 'FAILED',
      toolName: 'move_deal',
      durationMs: 45,
      input: { targetStageId: 'non-existent-stage-id' },
      output: { success: false, message: 'Stage não encontrado ou não pertence ao pipeline do agente' },
    },
    { type: 'PAUSE_CHECK', status: 'PASSED', durationMs: 3 },
    {
      type: 'SEND_MESSAGE',
      status: 'PASSED',
      durationMs: 290,
      output: { responseLength: 180, provider: 'evolution' },
    },
    {
      type: 'FOLLOW_UP_SCHEDULE',
      status: 'SKIPPED',
      output: { reason: 'no_follow_ups_for_step' },
    },
    { type: 'MEMORY_COMPRESSION', status: 'SKIPPED', output: { reason: 'below_threshold' } },
  ]

  await createExecution({
    agentId,
    orgId,
    conversationId,
    triggerMessageId: 'seed-failed-2',
    status: 'COMPLETED', // A execução completa mesmo com tool failure — o agente respondeu
    startedAt: minutesAgo(15),
    durationMs: 2445,
    modelId: 'google/gemini-2.5-flash',
    inputTokens: 1880,
    outputTokens: 310,
    creditsCost: 22,
    steps: failed2Steps,
  })
  console.log('  ⚠️  COMPLETED #3 — Tool call falhou (move_deal) mas agente respondeu')

  // -----------------------------------------------------------------------
  // 7. Cenário SKIPPED #1 — Debounce (mensagem mais nova existe)
  // -----------------------------------------------------------------------
  const skipped1Steps: StepData[] = [
    {
      type: 'DEBOUNCE_CHECK',
      status: 'SKIPPED',
      durationMs: 6,
      output: { reason: 'newer_message_exists' },
    },
  ]

  await createExecution({
    agentId,
    orgId,
    conversationId,
    triggerMessageId: 'seed-skipped-1',
    status: 'SKIPPED',
    startedAt: minutesAgo(10),
    durationMs: 8,
    errorMessage: 'debounce',
    steps: skipped1Steps,
  })
  console.log('  ⏭️  SKIPPED #1 — Debounce (mensagem mais nova existe)')

  // -----------------------------------------------------------------------
  // 8. Cenário SKIPPED #2 — Sem créditos
  // -----------------------------------------------------------------------
  const skipped2Steps: StepData[] = [
    { type: 'DEBOUNCE_CHECK', status: 'PASSED', durationMs: 11 },
    {
      type: 'CONTEXT_LOADING',
      status: 'PASSED',
      durationMs: 205,
      output: { model: 'google/gemini-2.5-pro', historyCount: 3, hasSummary: false },
    },
    {
      type: 'CREDIT_CHECK',
      status: 'FAILED',
      durationMs: 20,
      output: { reason: 'no_credits', estimatedCost: 42 },
    },
  ]

  await createExecution({
    agentId,
    orgId,
    conversationId,
    triggerMessageId: 'seed-skipped-2',
    status: 'SKIPPED',
    startedAt: minutesAgo(5),
    durationMs: 240,
    errorMessage: 'no_credits',
    steps: skipped2Steps,
  })
  console.log('  ⏭️  SKIPPED #2 — Sem créditos suficientes')

  // -----------------------------------------------------------------------
  // Resumo
  // -----------------------------------------------------------------------
  console.log('\n✅ Seed Agent Executions concluído!')
  console.log('  → 2 COMPLETED (fluxo completo + áudio/knowledge)')
  console.log('  → 1 COMPLETED com tool failure (move_deal falhou)')
  console.log('  → 1 FAILED (LLM timeout)')
  console.log('  → 2 SKIPPED (debounce + sem créditos)')
  console.log(`\n  🔗 Visualizar em: /org/<slug>/ai-agent/${agentId}/executions`)
}

// -----------------------------------------------------------------------
// Helper: criar execução + steps em transaction
// -----------------------------------------------------------------------

interface CreateExecutionParams {
  agentId: string
  orgId: string
  conversationId: string
  triggerMessageId: string
  status: 'COMPLETED' | 'FAILED' | 'SKIPPED'
  startedAt: Date
  durationMs: number
  modelId?: string
  inputTokens?: number
  outputTokens?: number
  creditsCost?: number
  errorMessage?: string
  steps: StepData[]
}

async function createExecution(params: CreateExecutionParams) {
  const executionId = crypto.randomUUID()
  const completedAt = new Date(params.startedAt.getTime() + params.durationMs)

  await db.$transaction([
    db.agentExecution.create({
      data: {
        id: executionId,
        agentId: params.agentId,
        organizationId: params.orgId,
        conversationId: params.conversationId,
        triggerMessageId: params.triggerMessageId,
        status: params.status,
        startedAt: params.startedAt,
        completedAt,
        durationMs: params.durationMs,
        modelId: params.modelId ?? null,
        inputTokens: params.inputTokens ?? null,
        outputTokens: params.outputTokens ?? null,
        creditsCost: params.creditsCost ?? null,
        errorMessage: params.errorMessage ?? null,
      },
    }),
    db.agentExecutionStep.createMany({
      data: params.steps.map((step, index) => ({
        executionId,
        order: index + 1,
        type: step.type,
        status: step.status,
        toolName: step.toolName ?? null,
        input: step.input
          ? (step.input as Prisma.InputJsonValue)
          : Prisma.DbNull,
        output: step.output
          ? (step.output as Prisma.InputJsonValue)
          : Prisma.DbNull,
        durationMs: step.durationMs ?? null,
      })),
    }),
  ])
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
