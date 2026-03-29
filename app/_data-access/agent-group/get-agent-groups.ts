import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface AgentGroupMemberSummary {
  id: string
  agentId: string
  agentName: string
  scopeLabel: string
  isActive: boolean       // member.isActive (ativo nesta equipe)
  agentIsActive: boolean  // agent.isActive (ativo globalmente)
}

export interface AgentGroupDto {
  id: string
  name: string
  description: string | null
  isActive: boolean
  routerModelId: string
  routerConfig: RouterConfig | null
  memberCount: number
  members: AgentGroupMemberSummary[]
  inboxCount: number
  createdAt: Date
}

export interface RouterConfig {
  fallbackAgentId: string | null
  rules?: Array<{
    agentId: string
    keywords?: string[]
    description?: string
  }>
}

const fetchAgentGroupsFromDb = async (
  orgId: string,
): Promise<AgentGroupDto[]> => {
  const groups = await db.agentGroup.findMany({
    where: { organizationId: orgId },
    include: {
      members: {
        include: {
          agent: {
            select: { name: true, isActive: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: { inboxes: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    isActive: group.isActive,
    routerModelId: group.routerModelId,
    routerConfig: group.routerConfig as RouterConfig | null,
    memberCount: group.members.length,
    members: group.members.map((member) => ({
      id: member.id,
      agentId: member.agentId,
      agentName: member.agent.name,
      scopeLabel: member.scopeLabel,
      isActive: member.isActive,
      agentIsActive: member.agent.isActive,
    })),
    inboxCount: group._count.inboxes,
    createdAt: group.createdAt,
  }))
}

export const getAgentGroups = cache(
  async (orgId: string): Promise<AgentGroupDto[]> => {
    const getCached = unstable_cache(
      async () => fetchAgentGroupsFromDb(orgId),
      [`agent-groups-${orgId}`],
      { tags: [`agentGroups:${orgId}`] },
    )

    return getCached()
  },
)
