import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/_components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

interface ScoreFreshnessHintProps {
  scoredAt: Date | null
}

/** Scores são considerados stale após 26 horas (cron noturno + margem) */
const STALE_THRESHOLD_MS = 26 * 60 * 60 * 1000

export function ScoreFreshnessHint({ scoredAt }: ScoreFreshnessHintProps) {
  if (!scoredAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="cursor-default">
              Scores em cálculo...
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            O primeiro cálculo ocorrerá na próxima madrugada.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const isStale = Date.now() - scoredAt.getTime() >= STALE_THRESHOLD_MS

  if (isStale) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="cursor-default">
              Scores desatualizados
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            O job noturno falhou. Contate o suporte se persistir.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const distance = formatDistanceToNow(scoredAt, { locale: ptBR, addSuffix: true })

  return (
    <span className="text-sm text-muted-foreground">
      Atualizado {distance}
    </span>
  )
}
