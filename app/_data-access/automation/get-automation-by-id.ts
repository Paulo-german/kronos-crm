import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import type {
  AutomationAction,
  AutomationExecutionStatus,
  AutomationTrigger,
} from '@prisma/client'

export interface AutomationDetailDto {
  id: string
  name: string
  description: string | null
  isActive: boolean
  triggerType: AutomationTrigger
  triggerConfig: Record<string, unknown>
  conditions: unknown[]
  actionType: AutomationAction
  actionConfig: Record<string, unknown>
  executionCount: number
  lastTriggeredAt: Date | null
  createdAt: Date
  updatedAt: Date
  creator: {
    fullName: string | null
  }
  executions: Array<{
    id: string
    status: AutomationExecutionStatus
    executedAt: Date
    durationMs: number | null
    errorMessage: string | null
    deal: { id: string; title: string } | null
  }>
  executionsTotalCount: number
}

const fetchAutomationByIdFromDb = async (
  automationId: string,
  orgId: string,
  executionPage: number,
  executionPageSize: number,
): Promise<AutomationDetailDto | null> => {
  const automation = await db.automation.findFirst({
    where: {
      id: automationId,
      // Garante que a automação pertence à organização do contexto (ownership check)
      organizationId: orgId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      triggerType: true,
      triggerConfig: true,
      conditions: true,
      actionType: true,
      actionConfig: true,
      executionCount: true,
      lastTriggeredAt: true,
      createdAt: true,
      updatedAt: true,
      creator: {
        select: { fullName: true },
      },
      executions: {
        select: {
          id: true,
          status: true,
          executedAt: true,
          durationMs: true,
          errorMessage: true,
          deal: {
            select: { id: true, title: true },
          },
        },
        orderBy: { executedAt: 'desc' },
        skip: executionPage * executionPageSize,
        take: executionPageSize,
      },
      _count: {
        select: { executions: true },
      },
    },
  })

  if (!automation) return null

  return {
    id: automation.id,
    name: automation.name,
    description: automation.description,
    isActive: automation.isActive,
    triggerType: automation.triggerType,
    triggerConfig: automation.triggerConfig as Record<string, unknown>,
    conditions: automation.conditions as unknown[],
    actionType: automation.actionType,
    actionConfig: automation.actionConfig as Record<string, unknown>,
    executionCount: automation.executionCount,
    lastTriggeredAt: automation.lastTriggeredAt,
    createdAt: automation.createdAt,
    updatedAt: automation.updatedAt,
    creator: automation.creator,
    executions: automation.executions.map((execution) => ({
      id: execution.id,
      status: execution.status,
      executedAt: execution.executedAt,
      durationMs: execution.durationMs,
      errorMessage: execution.errorMessage,
      deal: execution.deal,
    })),
    executionsTotalCount: automation._count.executions,
  }
}

/**
 * Busca uma automação específica por ID com execuções paginadas (Cacheado).
 * Realiza ownership check via organizationId para evitar acesso cross-org.
 * cache() do React deduplica chamadas dentro do mesmo request cycle.
 * A cache key inclui page/pageSize para evitar retornar dados paginados incorretos.
 */
export const getAutomationById = cache(
  async (
    automationId: string,
    ctx: RBACContext,
    executionPage = 0,
    executionPageSize = 20,
  ): Promise<AutomationDetailDto | null> => {
    const getCached = unstable_cache(
      async () =>
        fetchAutomationByIdFromDb(automationId, ctx.orgId, executionPage, executionPageSize),
      [`automation-${automationId}-page-${executionPage}-size-${executionPageSize}`],
      {
        tags: [`automation:${automationId}`, `automations:${ctx.orgId}`],
      },
    )

    return getCached()
  },
)
