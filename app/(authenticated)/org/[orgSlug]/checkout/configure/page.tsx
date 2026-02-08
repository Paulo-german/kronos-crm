import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { isElevated } from '@/_lib/rbac'
import { PLANS } from '@/(authenticated)/org/[orgSlug]/settings/billing/_components/plans-data'
import { ConfigureForm } from './_components/configure-form'

interface ConfigurePageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ plan?: string }>
}

export default async function ConfigurePage({
  params,
  searchParams,
}: ConfigurePageProps) {
  const { orgSlug } = await params
  const { plan: planParam } = await searchParams
  const { userRole } = await getOrgContext(orgSlug)

  if (!isElevated(userRole)) {
    redirect(`/org/${orgSlug}/settings/billing`)
  }

  const selectedPlan = PLANS.find((p) => p.id === planParam)

  if (!selectedPlan || selectedPlan.id === 'free') {
    redirect(`/org/${orgSlug}/settings/billing`)
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">
        Configurar plano {selectedPlan.name}
      </h1>
      <p className="mb-8 text-muted-foreground">
        Escolha o intervalo de cobrança e a quantidade de licenças.
      </p>

      <ConfigureForm plan={selectedPlan} orgSlug={orgSlug} />
    </div>
  )
}
