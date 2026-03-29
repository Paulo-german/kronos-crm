import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RouterConfig, AgentGroupDto } from './get-agent-groups'

export interface AgentGroupMemberDetail {
  id: string
  agentId: string
  agentName: string
  scopeLabel: string
  isActive: boolean       // member.isActive (ativo nesta equipe)
  agentIsActive: boolean  // agent.isActive (ativo globalmente)
  modelId: string
}

export interface AgentGroupInboxDto {
  id: string
  name: string
  channel: string
  isActive: boolean
}

export interface AgentGroupDetailDto extends Omit<AgentGroupDto, 'members'> {
  routerPrompt: string | null
  members: AgentGroupMemberDetail[]
  inboxes: AgentGroupInboxDto[]
}

const fetchAgentGroupByIdFromDb = async (
  groupId: string,
  orgId: string,
): Promise<AgentGroupDetailDto | null> => {
  const group = await db.agentGroup.findFirst({
    where: { id: groupId, organizationId: orgId },
    include: {
      members: {
        include: {
          agent: {
            select: { name: true, isActive: true, modelId: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      inboxes: {
        select: { id: true, name: true, channel: true, isActive: true },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: { inboxes: true },
      },
    },
  })

  if (!group) return null

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    isActive: group.isActive,
    routerModelId: group.routerModelId,
    routerPrompt: group.routerPrompt,
    routerConfig: group.routerConfig as RouterConfig | null,
    memberCount: group.members.length,
    members: group.members.map((member) => ({
      id: member.id,
      agentId: member.agentId,
      agentName: member.agent.name,
      scopeLabel: member.scopeLabel,
      isActive: member.isActive,
      agentIsActive: member.agent.isActive,
      modelId: member.agent.modelId,
    })),
    inboxCount: group._count.inboxes,
    inboxes: group.inboxes.map((inbox) => ({
      id: inbox.id,
      name: inbox.name,
      channel: inbox.channel,
      isActive: inbox.isActive,
    })),
    createdAt: group.createdAt,
  }
}

export const getAgentGroupById = cache(
  async (groupId: string, orgId: string): Promise<AgentGroupDetailDto | null> => {
    const getCached = unstable_cache(
      async () => fetchAgentGroupByIdFromDb(groupId, orgId),
      [`agent-group-${groupId}`],
      { tags: [`agentGroup:${groupId}`, `agentGroups:${orgId}`] },
    )

    return getCached()
  },
)
