import 'server-only'
import { cache } from 'react'
import { db } from '@/_lib/prisma'
import type { RouterConfig } from './get-agent-groups'

export interface InboxGroupWorker {
  agentId: string
  name: string
  scopeLabel: string
  isActive: boolean
}

export interface InboxGroupConfig {
  groupId: string
  isActive: boolean
  router: {
    modelId: string
    prompt: string | null
    config: RouterConfig | null
  }
  workers: InboxGroupWorker[]
}

const fetchGroupForInboxFromDb = async (inboxId: string): Promise<InboxGroupConfig | null> => {
  const inbox = await db.inbox.findUnique({
    where: { id: inboxId },
    select: {
      agentGroup: {
        select: {
          id: true,
          isActive: true,
          routerModelId: true,
          routerPrompt: true,
          routerConfig: true,
          members: {
            include: {
              agent: {
                select: { name: true, isActive: true },
              },
            },
          },
        },
      },
    },
  })

  const group = inbox?.agentGroup
  if (!group) return null

  return {
    groupId: group.id,
    isActive: group.isActive,
    router: {
      modelId: group.routerModelId,
      prompt: group.routerPrompt,
      config: group.routerConfig as RouterConfig | null,
    },
    workers: group.members.map((member) => ({
      agentId: member.agentId,
      name: member.agent.name,
      scopeLabel: member.scopeLabel,
      isActive: member.agent.isActive,
    })),
  }
}

// Usa apenas cache() do React para dedup dentro da mesma request.
// Não usa unstable_cache — esta função roda no webhook/runtime e não deve ser cacheada entre requests.
export const getGroupForInbox = cache(
  async (inboxId: string): Promise<InboxGroupConfig | null> => {
    return fetchGroupForInboxFromDb(inboxId)
  },
)
