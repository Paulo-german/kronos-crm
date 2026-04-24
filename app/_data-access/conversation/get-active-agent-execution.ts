import { db } from '@/_lib/prisma'
import type { AgentExecutionStepType, AgentExecutionStepStatus } from '@prisma/client'
import type { AgentStatusState } from '@/_lib/inbox/agent-status-types'

export interface ActiveAgentExecutionDto {
  conversationId: string
  state: AgentStatusState
  agentName: string
  toolName?: string
  updatedAt: string
}

// Janela de tempo em segundos para considerar uma execução ainda ativa
const ACTIVE_EXECUTION_WINDOW_SECONDS = 120

interface GetActiveAgentExecutionArgs {
  conversationId: string
  organizationId: string
}

export async function getActiveAgentExecution(
  args: GetActiveAgentExecutionArgs,
): Promise<ActiveAgentExecutionDto> {
  const { conversationId, organizationId } = args

  const windowStart = new Date(
    Date.now() - ACTIVE_EXECUTION_WINDOW_SECONDS * 1000,
  )

  // Busca execução em andamento (completedAt null) dentro da janela de 120s.
  // O filtro por organizationId garante isolamento entre orgs (RBAC implícito).
  const execution = await db.agentExecution.findFirst({
    where: {
      conversationId,
      organizationId,
      completedAt: null,
      startedAt: { gte: windowStart },
    },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      agent: {
        select: { name: true },
      },
      steps: {
        orderBy: { order: 'desc' },
        take: 1,
        select: {
          type: true,
          status: true,
          toolName: true,
          createdAt: true,
        },
      },
    },
  })

  // Nenhuma execução ativa: agente está ocioso
  if (!execution) {
    return {
      conversationId,
      state: 'idle',
      agentName: 'Agente',
      updatedAt: new Date().toISOString(),
    }
  }

  const agentName = execution.agent?.name ?? 'Agente'
  const lastStep = execution.steps[0]

  // Sem steps ainda: execução acabou de iniciar
  if (!lastStep) {
    return {
      conversationId,
      state: 'thinking',
      agentName,
      updatedAt: new Date().toISOString(),
    }
  }

  const state = inferStateFromStep(lastStep)

  return {
    conversationId,
    state: state.state,
    agentName,
    toolName: state.toolName,
    updatedAt: lastStep.createdAt.toISOString(),
  }
}

interface StepSnapshot {
  type: AgentExecutionStepType
  status: AgentExecutionStepStatus
  toolName: string | null
  createdAt: Date
}

interface InferredState {
  state: AgentStatusState
  toolName?: string
}

function inferStateFromStep(step: StepSnapshot): InferredState {
  // TOOL_CALL finalizado (PASSED ou FAILED) sem step posterior → executando tool
  if (step.type === 'TOOL_CALL' && (step.status === 'PASSED' || step.status === 'FAILED')) {
    return {
      state: 'running_tool',
      toolName: step.toolName ?? undefined,
    }
  }

  // LLM_CALL concluído (PASSED) → agente está compondo a resposta
  // SEND_MESSAGE ainda não existe no banco neste momento (só aparece após o envio)
  if (step.type === 'LLM_CALL' && step.status === 'PASSED') {
    return { state: 'composing' }
  }

  // CONTEXT_LOADING, CREDIT_CHECK, ROUTER_CLASSIFICATION, LLM_CALL em andamento,
  // DEBOUNCE_CHECK, AUDIO_TRANSCRIPTION, IMAGE_TRANSCRIPTION, MEDIA_DOWNLOAD, etc.
  return { state: 'thinking' }
}
