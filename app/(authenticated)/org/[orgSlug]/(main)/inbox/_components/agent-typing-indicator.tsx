'use client'

import { Avatar, AvatarFallback } from '@/_components/ui/avatar'
import { useAgentStatus } from '../_hooks/use-agent-status'
import type { AgentStatusPayload } from '@/_lib/inbox/agent-status-types'

interface AgentTypingIndicatorProps {
  conversationId: string
  getStatus: (id: string) => AgentStatusPayload | null
}

export function AgentTypingIndicator({ conversationId, getStatus }: AgentTypingIndicatorProps) {
  const { isActive, agentName, label } = useAgentStatus({
    conversationId,
    getStatus,
  })

  if (!isActive) return null

  return (
    <div className="flex items-center gap-2 border-t border-border/50 bg-muted/30 px-4 py-2">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback className="bg-primary/10 text-xs text-primary">
          {agentName?.[0]?.toUpperCase() ?? 'A'}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm text-muted-foreground">{label}</span>
      {/* Três pontos animados com delays escalonados — CSS only */}
      <div className="flex gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  )
}
