import { notFound } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgentById } from '@/_data-access/agent/get-agent-by-id'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getInboxes } from '@/_data-access/inbox/get-inboxes'
import AgentDetailClient from './_components/agent-detail-client'

interface AgentDetailPageProps {
  params: Promise<{ orgSlug: string; agentId: string }>
}

const AgentDetailPage = async ({ params }: AgentDetailPageProps) => {
  const { orgSlug, agentId } = await params
  const ctx = await getOrgContext(orgSlug)

  const [agent, pipelines, inboxes] = await Promise.all([
    getAgentById(agentId, ctx.orgId),
    getOrgPipelines(ctx.orgId),
    getInboxes(ctx.orgId),
  ])

  if (!agent) notFound()

  // Inboxes disponíveis para vincular (sem agent ou do próprio agent)
  const availableInboxes = inboxes.map((inbox) => ({
    id: inbox.id,
    name: inbox.name,
    channel: inbox.channel,
    agentId: inbox.agentId,
  }))

  return (
    <AgentDetailClient
      agent={agent}
      pipelines={pipelines}
      userRole={ctx.userRole}
      orgSlug={orgSlug}
      availableInboxes={availableInboxes}
    />
  )
}

export default AgentDetailPage
