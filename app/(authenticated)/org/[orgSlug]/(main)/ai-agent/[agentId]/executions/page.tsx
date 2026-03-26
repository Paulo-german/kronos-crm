import { notFound } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgentById } from '@/_data-access/agent/get-agent-by-id'
import { getAgentExecutions } from '@/_data-access/agent-execution/get-agent-executions'
import { canPerformAction } from '@/_lib/rbac/guards'
import ExecutionsList from './_components/executions-list'
import type { AgentExecutionStatus } from '@prisma/client'

const VALID_STATUSES: AgentExecutionStatus[] = ['COMPLETED', 'FAILED', 'SKIPPED']

function parseStatus(value: string | undefined): AgentExecutionStatus | undefined {
  if (!value) return undefined
  return VALID_STATUSES.includes(value as AgentExecutionStatus)
    ? (value as AgentExecutionStatus)
    : undefined
}

/**
 * Cria Date local a partir de yyyy-MM-dd + HH:mm sem problemas de timezone.
 */
function buildLocalDate(dateStr: string, time?: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = (time ?? '00:00').split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

interface ExecutionsPageProps {
  params: Promise<{ orgSlug: string; agentId: string }>
  searchParams: Promise<{
    status?: string
    startDate?: string
    endDate?: string
    timeFrom?: string
    timeTo?: string
    page?: string
  }>
}

const ExecutionsPage = async ({
  params,
  searchParams,
}: ExecutionsPageProps) => {
  const { orgSlug, agentId } = await params
  const ctx = await getOrgContext(orgSlug)

  // RBAC: apenas OWNER e ADMIN podem visualizar execuções
  const permission = canPerformAction(ctx, 'agent', 'update')
  if (!permission.allowed) {
    notFound()
  }

  const resolvedSearchParams = await searchParams
  const filters = {
    status: parseStatus(resolvedSearchParams.status),
    startDate: resolvedSearchParams.startDate
      ? buildLocalDate(resolvedSearchParams.startDate, resolvedSearchParams.timeFrom)
      : undefined,
    endDate: resolvedSearchParams.endDate
      ? buildLocalDate(resolvedSearchParams.endDate, resolvedSearchParams.timeTo)
      : undefined,
    page: resolvedSearchParams.page ? Number(resolvedSearchParams.page) : 1,
    perPage: 20,
  }

  const [agent, paginatedExecutions] = await Promise.all([
    getAgentById(agentId, ctx.orgId),
    getAgentExecutions(ctx.orgId, agentId, filters),
  ])

  if (!agent) notFound()

  return (
    <ExecutionsList
      initialData={paginatedExecutions}
      orgSlug={orgSlug}
    />
  )
}

export default ExecutionsPage
