import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { getAllQuotas } from '@/_data-access/billing/get-all-quotas'
import { getTrialStatus } from '@/_data-access/billing/get-trial-status'
import { BillingTabs } from './_components/billing-tabs'

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

  const [{ plan }, quotas, trialStatus] = await Promise.all([
    getPlanLimits(orgId),
    getAllQuotas(orgId),
    getTrialStatus(orgId),
  ])

  return (
    <div className="container mx-auto space-y-8 py-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/org/${orgSlug}/settings`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <BillingTabs
        plan={plan}
        quotas={quotas}
        isOnTrial={trialStatus.isOnTrial}
        orgSlug={orgSlug}
      />
    </div>
  )
}
