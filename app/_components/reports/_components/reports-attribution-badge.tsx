import { Badge } from '@/_components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

type AttributionModel = 'first' | 'last' | 'per_deal'

const ATTRIBUTION_LABELS: Record<AttributionModel, string> = {
  first: 'First touch',
  last: 'Last touch',
  per_deal: 'Per deal',
}

const ATTRIBUTION_DESCRIPTIONS: Record<AttributionModel, string> = {
  first: 'Atribuição ao primeiro canal que capturou o contato.',
  last: 'Atribuição ao último canal que interagiu antes da conversão.',
  per_deal: 'Atribuição canal-a-canal por deal, via DealCaptureEvent.',
}

interface ReportsAttributionBadgeProps {
  model: AttributionModel
}

export function ReportsAttributionBadge({ model }: ReportsAttributionBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="cursor-default text-xs font-normal">
          {ATTRIBUTION_LABELS[model]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-[200px] text-xs">{ATTRIBUTION_DESCRIPTIONS[model]}</p>
      </TooltipContent>
    </Tooltip>
  )
}
