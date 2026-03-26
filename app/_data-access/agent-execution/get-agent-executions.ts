import 'server-only'
import { cache } from 'react'
import { db } from '@/_lib/prisma'
import type {
  AgentExecutionStatus,
} from '@prisma/client'

// DTOs de leitura para execuções do agente

export interface AgentExecutionDto {
  id: string
  status: AgentExecutionStatus
  startedAt: Date
  completedAt: Date | null
  durationMs: number | null
  modelId: string | null
  inputTokens: number | null
  outputTokens: number | null
  creditsCost: number | null
  errorMessage: string | null
  conversationId: string
  contactName: string | null
  stepsCount: number
  createdAt: Date
}

export interface PaginatedAgentExecutions {
  executions: AgentExecutionDto[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface AgentExecutionFilter {
  status?: AgentExecutionStatus
  startDate?: Date
  endDate?: Date
  page?: number
  perPage?: number
}

const fetchExecutionsFromDb = async (
  orgId: string,
  agentId: string,
  filters?: Partial<AgentExecutionFilter>,
): Promise<PaginatedAgentExecutions> => {
  const page = filters?.page ?? 1
  const perPage = filters?.perPage ?? 20

  const startDate = filters?.startDate
  const endDate = filters?.endDate

  const whereClause = {
    agentId,
    organizationId: orgId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(startDate || endDate
      ? {
          startedAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  }

  const [executions, total] = await Promise.all([
    db.agentExecution.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { steps: true },
        },
        conversation: {
          select: {
            contact: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.agentExecution.count({ where: whereClause }),
  ])

  return {
    executions: executions.map((execution) => ({
      id: execution.id,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      durationMs: execution.durationMs,
      modelId: execution.modelId,
      inputTokens: execution.inputTokens,
      outputTokens: execution.outputTokens,
      creditsCost: execution.creditsCost,
      errorMessage: execution.errorMessage,
      conversationId: execution.conversationId,
      contactName: execution.conversation?.contact?.name ?? null,
      stepsCount: execution._count.steps,
      createdAt: execution.createdAt,
    })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
}

// Sem unstable_cache — apenas dedup React por request (sem TTL server-side)
// Client-side polling via router.refresh() a cada 60s
export const getAgentExecutions = cache(
  async (
    orgId: string,
    agentId: string,
    filters?: Partial<AgentExecutionFilter>,
  ): Promise<PaginatedAgentExecutions> => {
    return fetchExecutionsFromDb(orgId, agentId, filters)
  },
)
