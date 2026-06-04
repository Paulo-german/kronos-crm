import { notFound } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgentGroupById } from '@/_data-access/agent-group/get-agent-group-by-id'
import { getAgents } from '@/_data-access/agent/get-agents'
import { GroupDetailClient } from '@/(authenticated)/org/[orgSlug]/(agents)/agents/ai-agent/groups/[groupId]/_components/group-detail-client'

interface AgentGroupDetailPageProps {
  params: Promise<{ orgSlug: string; groupId: string }>
}

const AgentGroupDetailPage = async ({ params }: AgentGroupDetailPageProps) => {
  const { orgSlug, groupId } = await params
  const ctx = await getOrgContext(orgSlug)

  const [group, allOrgAgents] = await Promise.all([
    getAgentGroupById(groupId, ctx.orgId),
    getAgents(ctx.orgId),
  ])

  if (!group) notFound()

  return <GroupDetailClient group={group} allOrgAgents={allOrgAgents} orgSlug={orgSlug} />
}

export default AgentGroupDetailPage
