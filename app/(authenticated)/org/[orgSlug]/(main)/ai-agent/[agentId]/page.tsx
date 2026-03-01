import { notFound } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgentById } from '@/_data-access/agent/get-agent-by-id'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getAgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import { getEvolutionInstanceInfo } from '@/_lib/evolution/instance-management'
import AgentDetailClient from './_components/agent-detail-client'

interface AgentDetailPageProps {
  params: Promise<{ orgSlug: string; agentId: string }>
}

const AgentDetailPage = async ({ params }: AgentDetailPageProps) => {
  const { orgSlug, agentId } = await params
  const ctx = await getOrgContext(orgSlug)

  const [agent, pipelines] = await Promise.all([
    getAgentById(agentId, ctx.orgId),
    getOrgPipelines(ctx.orgId),
  ])

  if (!agent) notFound()

  // Buscar info e stats da conexão em paralelo (se tem instância)
  const [connectionStats, instanceInfo] = agent.evolutionInstanceName
    ? await Promise.all([
        getAgentConnectionStats(agentId),
        getEvolutionInstanceInfo(agent.evolutionInstanceName),
      ])
    : [null, null]

  return (
    <AgentDetailClient
      agent={agent}
      pipelines={pipelines}
      userRole={ctx.userRole}
      orgSlug={orgSlug}
      connectionStats={connectionStats}
      instanceInfo={instanceInfo}
    />
  )
}

export default AgentDetailPage
