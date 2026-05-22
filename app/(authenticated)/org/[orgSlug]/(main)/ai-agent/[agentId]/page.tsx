import { notFound } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgentById } from '@/_data-access/agent/get-agent-by-id'
import { getOrgPipelines } from '@/_data-access/pipeline/get-org-pipelines'
import { getPipelineStages } from '@/_data-access/pipeline/get-pipeline-stages'
import { getInboxes } from '@/_data-access/inbox/get-inboxes'
import { getAgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import { getEvolutionInstanceInfo } from '@/_lib/evolution-js/instance-management'
import { resolveEvolutionCredentials } from '@/_lib/evolution-js/resolve-credentials'
import { getFollowUps } from '@/_data-access/follow-up/get-follow-ups'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { getServices } from '@/_data-access/service/get-services'
import { resolveCanonicalAgentVersion } from '@/_lib/agent/agent-version'
import AgentDetailClient from './_components/agent-detail-client'
import AgentDetailV2Client from './_components/v2/agent-detail-v2-client'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import { AgentDetailIntroTrigger } from '@/_components/tutorials/agent-detail-intro-trigger'

interface AgentDetailPageProps {
  params: Promise<{ orgSlug: string; agentId: string }>
}

const AgentDetailPage = async ({ params }: AgentDetailPageProps) => {
  const { orgSlug, agentId } = await params
  const ctx = await getOrgContext(orgSlug)

  const [agent, pipelines, inboxes, followUps, followUpQuota, services, completedTutorialIds] = await Promise.all([
    getAgentById(agentId, ctx.orgId),
    getOrgPipelines(ctx.orgId),
    getInboxes(ctx.orgId),
    getFollowUps(agentId, ctx.orgId),
    checkPlanQuota(ctx.orgId, 'follow_up'),
    getServices(ctx.orgId),
    getTutorialCompletions(ctx.userId, ctx.orgId),
  ])

  if (!agent) notFound()

  const pipelineStages = await getPipelineStages(agent.pipelineIds, ctx.orgId)

  // Buscar dados de conexão para cada inbox vinculada
  const inboxConnectionEntries = await Promise.all(
    agent.inboxes.map(async (inbox) => {
      if (!inbox.evolutionInstanceName) {
        return { inboxId: inbox.id, stats: null, info: null }
      }
      const [stats, info] = await Promise.all([
        getAgentConnectionStats(inbox.id),
        resolveEvolutionCredentials(inbox.id).then((credentials) =>
          getEvolutionInstanceInfo(inbox.evolutionInstanceName!, credentials),
        ),
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

  const sharedProps = {
    agent,
    pipelines,
    pipelineStages,
    userRole: ctx.userRole,
    orgSlug,
    availableInboxes,
    inboxConnectionData,
    followUps,
    followUpQuota,
    hasActiveServices: services.length > 0,
  }

  const trigger = (
    <AgentDetailIntroTrigger
      hasSeenAgentDetailIntro={completedTutorialIds.includes('agent-detail')}
    />
  )

  if (resolveCanonicalAgentVersion(agent.agentVersion) === 'single-v2') {
    return (
      <>
        {trigger}
        <AgentDetailV2Client {...sharedProps} />
      </>
    )
  }

  return (
    <>
      {trigger}
      <AgentDetailClient {...sharedProps} />
    </>
  )
}

export default AgentDetailPage
