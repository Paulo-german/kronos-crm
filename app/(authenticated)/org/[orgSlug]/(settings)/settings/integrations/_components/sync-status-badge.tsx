'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/_components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

interface SyncStatusBadgeProps {
  lastSyncAt: Date | null
  syncError: string | null
}

const SyncStatusBadge = ({ lastSyncAt, syncError }: SyncStatusBadgeProps) => {
  if (syncError) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="cursor-help border-red-500/20 bg-red-500/10 text-red-500"
          >
            Erro de sincronização
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{syncError}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  if (lastSyncAt) {
    const relativeTime = formatDistanceToNow(new Date(lastSyncAt), {
      locale: ptBR,
      addSuffix: true,
    })

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help text-sm text-muted-foreground">
            Último sync: {relativeTime}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{new Date(lastSyncAt).toLocaleString('pt-BR')}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <span className="text-sm text-muted-foreground">Nunca sincronizado</span>
  )
}

export default SyncStatusBadge
