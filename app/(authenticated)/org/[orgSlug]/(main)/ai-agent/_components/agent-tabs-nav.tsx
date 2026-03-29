'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BotIcon, UsersIcon, LockIcon } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { cn } from '@/_lib/utils'

interface AgentTabsNavProps {
  orgSlug: string
  canAccessGroups: boolean
}

export function AgentTabsNav({ orgSlug, canAccessGroups }: AgentTabsNavProps) {
  const pathname = usePathname()

  const agentsPath = `/org/${orgSlug}/ai-agent`
  const groupsPath = `/org/${orgSlug}/ai-agent/groups`

  // Esconder tabs nas páginas de detalhe (agente individual ou equipe específica)
  const uuidSegment =
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
  const isAgentDetail =
    pathname !== agentsPath &&
    !pathname.startsWith(groupsPath) &&
    uuidSegment.test(pathname)
  const isGroupDetail =
    pathname.startsWith(groupsPath) && pathname !== groupsPath

  if (isAgentDetail || isGroupDetail) return null

  const isAgentsActive = pathname === agentsPath
  const isGroupsActive = pathname === groupsPath

  return (
    <div className="px-4 pt-4 md:px-0 md:pt-6">
      <div className="grid h-12 w-full grid-cols-2 rounded-md border border-border/50 bg-tab/30 p-1">
        <Link
          href={agentsPath}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
            isAgentsActive
              ? 'bg-card/80 text-foreground shadow'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <BotIcon className="h-4 w-4" />
          Agentes
        </Link>

        {canAccessGroups ? (
          <Link
            href={groupsPath}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
              isGroupsActive
                ? 'bg-card/80 text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <UsersIcon className="h-4 w-4" />
            Equipes
            <Badge variant="outline" className="ml-1.5 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              Beta
            </Badge>
          </Link>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground opacity-50"
                aria-disabled="true"
              >
                <UsersIcon className="h-4 w-4" />
                Equipes
                <Badge variant="outline" className="ml-1.5 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  Beta
                </Badge>
                <LockIcon className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Equipes de agentes não estão disponíveis no plano Light. Faça
              upgrade para acessar.
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
