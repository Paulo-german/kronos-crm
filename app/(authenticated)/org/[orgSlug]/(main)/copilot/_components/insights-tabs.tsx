'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { Badge } from '@/_components/ui/badge'
import type {
  ContactsAtRiskResult,
  StalledDealsResult,
  ReactivationCandidatesResult,
  InsightsOverviewDto,
} from '@/_data-access/copilot/shared/insights-types'
import { TabContactsAtRisk } from './tab-contacts-at-risk'
import { TabStalledPipeline } from './tab-stalled-pipeline'
import { TabReactivation } from './tab-reactivation'
import { TabAutomations } from './tab-automations'

interface InsightsTabsProps {
  atRisk: ContactsAtRiskResult
  stalled: StalledDealsResult
  reactivation: ReactivationCandidatesResult
  counts: InsightsOverviewDto['counts']
  totalAtRisk: number
  orgSlug: string
}

export function InsightsTabs({
  atRisk,
  stalled,
  reactivation,
  counts,
  totalAtRisk,
  orgSlug,
}: InsightsTabsProps) {
  return (
    <Tabs defaultValue="at-risk" className="flex-1">
      <TabsList className="grid h-12 w-full grid-cols-4 rounded-md border border-border/50 bg-tab/30">
        <TabsTrigger value="at-risk" className="rounded-md py-2 data-[state=active]:bg-tab-active data-[state=active]:text-tab-foreground data-[state=active]:shadow-sm">
          <span className="flex items-center gap-1.5">
            Em risco
            {totalAtRisk > 0 && (
              <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                {totalAtRisk}
              </Badge>
            )}
          </span>
        </TabsTrigger>
        <TabsTrigger value="stalled" className="rounded-md py-2 data-[state=active]:bg-tab-active data-[state=active]:text-tab-foreground data-[state=active]:shadow-sm">
          <span className="flex items-center gap-1.5">
            Pipeline estagnado
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {counts.stalledDeals}
            </Badge>
          </span>
        </TabsTrigger>
        <TabsTrigger value="reactivation" className="rounded-md py-2 data-[state=active]:bg-tab-active data-[state=active]:text-tab-foreground data-[state=active]:shadow-sm">
          <span className="flex items-center gap-1.5">
            Reativação
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {counts.reactivationCandidates}
            </Badge>
          </span>
        </TabsTrigger>
        <TabsTrigger value="automations" className="rounded-md py-2 data-[state=active]:bg-tab-active data-[state=active]:text-tab-foreground data-[state=active]:shadow-sm">
          Automações
        </TabsTrigger>
      </TabsList>

      <TabsContent value="at-risk" className="mt-4">
        <TabContactsAtRisk initial={atRisk} orgSlug={orgSlug} />
      </TabsContent>

      <TabsContent value="stalled" className="mt-4">
        <TabStalledPipeline initial={stalled} orgSlug={orgSlug} />
      </TabsContent>

      <TabsContent value="reactivation" className="mt-4">
        <TabReactivation initial={reactivation} orgSlug={orgSlug} />
      </TabsContent>

      <TabsContent value="automations" className="mt-4">
        <TabAutomations />
      </TabsContent>
    </Tabs>
  )
}
