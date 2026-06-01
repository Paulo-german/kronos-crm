'use client'

import { parseAsStringEnum, useQueryState } from 'nuqs'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { ReportsAttributionBadge } from '../../_components/reports-attribution-badge'
import { useDrillDownState } from '../../_hooks/use-drill-down-state'
import { OverviewAnchorTable } from './overview-anchor-table'
import type { AttributionModel, ChannelAttributionDto } from '@/_data-access/reports/overview/get-channel-attribution'

const attributionParser = parseAsStringEnum<AttributionModel>(['first', 'last', 'per_deal'])
  .withDefault('first')
  .withOptions({ shallow: false })

interface OverviewAnchorMetricProps {
  data: ChannelAttributionDto
}

const MODEL_OPTIONS: { value: AttributionModel; label: string }[] = [
  { value: 'first', label: 'First touch' },
  { value: 'last', label: 'Last touch' },
  { value: 'per_deal', label: 'Por deal' },
]

export function OverviewAnchorMetric({ data }: OverviewAnchorMetricProps) {
  const [model, setModel] = useQueryState('attribution', attributionParser)
  const { openDrill } = useDrillDownState()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Atribuição por canal</CardTitle>
            <ReportsAttributionBadge model={model} />
          </div>
          <Select
            value={model}
            onValueChange={(value) => void setModel(value as AttributionModel)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <OverviewAnchorTable
          data={data}
          onDrillChannel={(channel) => openDrill(`anchor-channel:${channel}`)}
        />
      </CardContent>
    </Card>
  )
}
