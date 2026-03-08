import { notFound } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgentById } from '@/_data-access/agent/get-agent-by-id'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getInboxes } from '@/_data-access/inbox/get-inboxes'
import { getAgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import { getEvolutionInstanceInfo } from '@/_lib/evolution/instance-management'
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

  // Buscar dados de conexão para cada inbox vinculada
  const inboxConnectionEntries = await Promise.all(
    agent.inboxes.map(async (inbox) => {
      if (!inbox.evolutionInstanceName) {
        return { inboxId: inbox.id, stats: null, info: null }
      }
      const [stats, info] = await Promise.all([
        getAgentConnectionStats(inbox.id),
        getEvolutionInstanceInfo(inbox.evolutionInstanceName),
      ])
      return { inboxId: inbox.id, stats, info }
    }),
  )

  const inboxConnectionData: Record<string, { stats: Awaited<ReturnType<typeof getAgentConnectionStats>> | null; info: Awaited<ReturnType<typeof getEvolutionInstanceInfo>> | null }> = {}
  for (const entry of inboxConnectionEntries) {
    inboxConnectionData[entry.inboxId] = { stats: entry.stats, info: entry.info }
  }

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
      inboxConnectionData={inboxConnectionData}
    />
  )
}

export default AgentDetailPage
