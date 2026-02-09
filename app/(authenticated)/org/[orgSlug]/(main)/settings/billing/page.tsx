import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
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
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planos e Preços</h1>
        <p className="text-muted-foreground">
          Escolha o plano ideal para sua equipe.
        </p>
      </div>

      <PlansGrid currentPlan={plan} orgSlug={orgSlug} />

      <ComparisonTable />

      <PlansFaq />
    </div>
  )
}
