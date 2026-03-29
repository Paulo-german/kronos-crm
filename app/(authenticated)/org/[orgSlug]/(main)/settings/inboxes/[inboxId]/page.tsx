import { notFound } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getInboxById } from '@/_data-access/inbox/get-inbox-by-id'
import { getAgents } from '@/_data-access/agent/get-agents'
import { getAgentGroups } from '@/_data-access/agent-group/get-agent-groups'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getAgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import { getEvolutionInstanceInfo } from '@/_lib/evolution/instance-management'
import InboxDetailClient from './_components/inbox-detail-client'

interface InboxDetailPageProps {
  params: Promise<{ orgSlug: string; inboxId: string }>
}

const InboxDetailPage = async ({ params }: InboxDetailPageProps) => {
  const { orgSlug, inboxId } = await params
  const ctx = await getOrgContext(orgSlug)

  const [inbox, agents, agentGroups, membersData, pipelines] = await Promise.all([
    getInboxById(inboxId, ctx.orgId),
    getAgents(ctx.orgId),
    getAgentGroups(ctx.orgId),
    getOrganizationMembers(ctx.orgId),
    getOrgPipelines(ctx.orgId),
  ])

  if (!inbox) notFound()

  const [connectionStats, instanceInfo] = inbox.evolutionInstanceName
    ? await Promise.all([
        getAgentConnectionStats(inbox.id),
        getEvolutionInstanceInfo(inbox.evolutionInstanceName),
      ])
    : [null, null]

  const agentOptions = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
  }))

  const agentGroupOptions = agentGroups.map((group) => ({
    id: group.id,
    name: group.name,
    memberCount: group.memberCount,
    isActive: group.isActive,
  }))

  const metaBetaOrgIds = (process.env.NEXT_PUBLIC_META_BETA_ORG_IDS ?? '').split(',').filter(Boolean)
  const metaCloudEnabled = metaBetaOrgIds.length === 0 || metaBetaOrgIds.includes(ctx.orgId)

  return (
    <InboxDetailClient
      inbox={inbox}
      agentOptions={agentOptions}
      agentGroupOptions={agentGroupOptions}
      userRole={ctx.userRole}
      orgSlug={orgSlug}
      connectionStats={connectionStats}
      instanceInfo={instanceInfo}
      members={membersData.accepted}
      pipelines={pipelines}
      metaCloudEnabled={metaCloudEnabled}
    />
  )
}

export default InboxDetailPage
