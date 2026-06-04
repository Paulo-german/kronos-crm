import { notFound } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgentById } from '@/_data-access/agent/get-agent-by-id'
import { getAgentExecutions } from '@/_data-access/agent-execution/get-agent-executions'
import ExecutionsList from '@/(authenticated)/org/[orgSlug]/(agents)/agents/ai-agent/[agentId]/executions/_components/executions-list'
import type { AgentExecutionStatus } from '@prisma/client'

const VALID_STATUSES: AgentExecutionStatus[] = ['COMPLETED', 'FAILED', 'SKIPPED']

function parseStatus(value: string | undefined): AgentExecutionStatus | undefined {
  if (!value) return undefined
  return VALID_STATUSES.includes(value as AgentExecutionStatus)
    ? (value as AgentExecutionStatus)
    : undefined
}

function buildLocalDate(dateStr: string, time?: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = (time ?? '00:00').split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

interface AgentExecutionsPageProps {
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

const AgentExecutionsPage = async ({ params, searchParams }: AgentExecutionsPageProps) => {
  const { orgSlug, agentId } = await params
  const ctx = await getOrgContext(orgSlug)

  if (!ctx.isSupportAgent) {
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

  return <ExecutionsList initialData={paginatedExecutions} orgSlug={orgSlug} />
}

export default AgentExecutionsPage
