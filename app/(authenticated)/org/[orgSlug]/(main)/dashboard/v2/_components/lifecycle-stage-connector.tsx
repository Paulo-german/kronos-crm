import { ChevronRight } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'

interface StageConnectorProps {
  fromCount: number
  toCount: number
}

export function StageConnector({ fromCount, toCount }: StageConnectorProps) {
  const rate = fromCount === 0 ? null : Math.round((toCount / fromCount) * 100)

  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1.5">
      <Badge variant="secondary" className="tabular-nums">
        {rate === null ? '—' : `${rate}%`}
      </Badge>
      <ChevronRight className="size-3.5 text-muted-foreground/40" />
    </div>
  )
}
