import { findReportSection } from '../_config/report-sections'
import { ReportsSectionHeader } from '../_components/reports-section-header'

export default function OverviewPage() {
  const section = findReportSection('overview')

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title={section?.label ?? 'Visão geral'}
        description={section?.description}
      />
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        KPIs e métricas em breve — Fase 2
      </div>
    </div>
  )
}
