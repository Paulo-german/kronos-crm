import { Suspense } from 'react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getConversationLabels } from '@/_data-access/conversation-label/get-conversation-labels'
import { parseDateRange } from '@/_utils/date-range'
import { isElevated } from '@/_lib/rbac/permissions'
import type { InboxDashboardFilters } from '@/_data-access/dashboard'
import type { InboxChannel, ConversationStatus } from '@prisma/client'
import { findReportSection } from '@/_components/reports/_config/report-sections'
import { ReportsSectionHeader } from '@/_components/reports/_components/reports-section-header'
import { InboxFilters } from '@/_components/reports/inbox/_components/inbox-filters'
import { InboxKpiGrid } from '@/_components/dashboard/v1/_components/inbox-kpi-grid'
import { InboxVolumeSection } from '@/_components/dashboard/v1/_components/inbox-volume-section'
import { InboxChannelSection } from '@/_components/dashboard/v1/_components/inbox-channel-section'
import { InboxHeatmapSection } from '@/_components/dashboard/v1/_components/inbox-heatmap-section'
import { InboxTopLabelsSection } from '@/_components/dashboard/v1/_components/inbox-top-labels-section'
import { InboxAiHumanSection } from '@/_components/dashboard/v1/_components/inbox-ai-human-section'
import { InboxAttendantSection } from '@/_components/dashboard/v1/_components/inbox-attendant-section'
import {
  InboxKpiSkeleton,
  PipelineStatusSkeleton,
  InboxChartSkeleton,
  InboxHeatmapSkeleton,
  InboxBottomSkeleton,
} from '@/_components/dashboard/v1/_components/skeletons'

interface InboxReportPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    start?: string
    end?: string
    assignee?: string
    channel?: string
    labelId?: string
    inboxStatus?: string
    aiVsHuman?: string
  }>
}

export default async function InboxReportPage({ params, searchParams }: InboxReportPageProps) {
  const { orgSlug } = await params
  const { start, end, assignee, channel, labelId, inboxStatus, aiVsHuman } = await searchParams

  const ctx = await getOrgContext(orgSlug)
  const dateRange = parseDateRange(start, end)
  const elevated = isElevated(ctx.userRole)

  const section = findReportSection('inbox')
  const conversationLabels = await getConversationLabels(ctx.orgId)

  const inboxFilters: InboxDashboardFilters = {
    channel: channel as InboxChannel | undefined,
    assignee: elevated ? (assignee ?? undefined) : undefined,
    labelId: labelId ?? undefined,
    status: inboxStatus as ConversationStatus | undefined,
    aiVsHuman: aiVsHuman === 'ai' || aiVsHuman === 'human' ? aiVsHuman : undefined,
  }

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title={section?.label ?? 'Inbox'}
        description={section?.description}
      />

      <InboxFilters labels={conversationLabels} />

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="flex lg:col-span-2">
          <Suspense fallback={<InboxKpiSkeleton />}>
            <InboxKpiGrid ctx={ctx} dateRange={dateRange} filters={inboxFilters} />
          </Suspense>
        </div>
        <Suspense fallback={<PipelineStatusSkeleton />}>
          <InboxChannelSection ctx={ctx} dateRange={dateRange} filters={inboxFilters} />
        </Suspense>
      </div>

      <Suspense fallback={<InboxChartSkeleton />}>
        <InboxVolumeSection ctx={ctx} dateRange={dateRange} filters={inboxFilters} />
      </Suspense>

      <Suspense fallback={<InboxHeatmapSkeleton />}>
        <InboxHeatmapSection ctx={ctx} dateRange={dateRange} filters={inboxFilters} />
      </Suspense>

      <Suspense fallback={<InboxBottomSkeleton />}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InboxTopLabelsSection ctx={ctx} dateRange={dateRange} filters={inboxFilters} />
          <InboxAiHumanSection ctx={ctx} dateRange={dateRange} filters={inboxFilters} />
        </div>
      </Suspense>

      {elevated && (
        <Suspense fallback={<InboxChartSkeleton />}>
          <InboxAttendantSection ctx={ctx} dateRange={dateRange} filters={inboxFilters} />
        </Suspense>
      )}
    </div>
  )
}
