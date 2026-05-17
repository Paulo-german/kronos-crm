import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { isElevated } from '@/_lib/rbac'
import { ReportsSectionHeader } from '../_components/reports-section-header'
import { Clock } from 'lucide-react'

interface TeamReportPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function TeamReportPage({ params }: TeamReportPageProps) {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  if (!isElevated(ctx.userRole)) {
    redirect(`/org/${orgSlug}/reports/overview`)
  }

  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title="Time"
        description="Performance por vendedor e progresso das metas individuais."
      />
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Em breve</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Ranking de vendedores, metas individuais e drill por membro chegam em breve.
        </p>
      </div>
    </div>
  )
}
