import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { PlansGrid } from './_components/plans-grid'
import { ComparisonTable } from './_components/comparison-table'
import { PlansFaq } from './_components/plans-faq'

interface BillingSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function BillingSettingsPage({
  params,
}: BillingSettingsPageProps) {
  const { orgSlug } = await params
  const { userRole, orgId } = await getOrgContext(orgSlug)

  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    redirect(`/org/${orgSlug}/settings`)
  }

  const { plan } = await getPlanLimits(orgId)

  return (
    <div className="container mx-auto space-y-12 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planos e Preços</h1>
        <p className="text-muted-foreground">
          Escolha o plano ideal para sua equipe.
        </p>
      </div>

      <PlansGrid currentPlan={plan} />

      <ComparisonTable />

      <PlansFaq />
    </div>
  )
}
