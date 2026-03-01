import { notFound } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getInboxById } from '@/_data-access/inbox/get-inbox-by-id'
import { getAgents } from '@/_data-access/agent/get-agents'
import { getAgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import { getEvolutionInstanceInfo } from '@/_lib/evolution/instance-management'
import InboxDetailClient from './_components/inbox-detail-client'

interface InboxDetailPageProps {
  params: Promise<{ orgSlug: string; inboxId: string }>
}

const InboxDetailPage = async ({ params }: InboxDetailPageProps) => {
  const { orgSlug, inboxId } = await params
  const ctx = await getOrgContext(orgSlug)

  const [inbox, agents] = await Promise.all([
    getInboxById(inboxId, ctx.orgId),
    getAgents(ctx.orgId),
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

  return (
    <InboxDetailClient
      inbox={inbox}
      agentOptions={agentOptions}
      userRole={ctx.userRole}
      orgSlug={orgSlug}
      connectionStats={connectionStats}
      instanceInfo={instanceInfo}
    />
  )
}

export default InboxDetailPage
