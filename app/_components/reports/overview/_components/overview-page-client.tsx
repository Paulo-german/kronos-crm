'use client'

import type { KpiMetrics } from '@/_data-access/dashboard/types'
import type { ChannelAttributionDto } from '@/_data-access/reports/overview/get-channel-attribution'
import { useDrillDownState } from '../../_hooks/use-drill-down-state'
import { OverviewKpiGrid } from './overview-kpi-grid'
import { OverviewAnchorMetric } from './overview-anchor-metric'

interface OverviewPageClientProps {
  kpi: KpiMetrics
  channelAttribution: ChannelAttributionDto
}

export function OverviewPageClient({
  kpi,
  channelAttribution,
}: OverviewPageClientProps) {
  const { openDrill } = useDrillDownState()

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Grid */}
      <OverviewKpiGrid kpi={kpi} onDrillKpi={openDrill} />

      {/* Métrica âncora: atribuição por canal */}
      <OverviewAnchorMetric data={channelAttribution} />
    </div>
  )
}
