import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { isElevated } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { PLANS } from '@/(authenticated)/org/[orgSlug]/settings/billing/_components/plans-data'
import { RegisterForm } from './_components/register-form'
import type { CheckoutSearchParams } from '../_components/checkout-types'

interface RegisterPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<CheckoutSearchParams>
}

export default async function RegisterPage({
  params,
  searchParams,
}: RegisterPageProps) {
  const { orgSlug } = await params
  const { plan, interval, seats } = await searchParams
  const { userRole, orgId } = await getOrgContext(orgSlug)

  if (!isElevated(userRole)) {
    redirect(`/org/${orgSlug}/settings/billing`)
  }

  const selectedPlan = PLANS.find((p) => p.id === plan)
  if (!selectedPlan || selectedPlan.id === 'free') {
    redirect(`/org/${orgSlug}/settings/billing`)
  }

  // Carregar dados existentes da organização para pré-preencher o formulário
  const org = await db.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: {
      personType: true,
      taxId: true,
      legalName: true,
      tradeName: true,
      billingContactName: true,
      billingContactEmail: true,
      billingContactPhone: true,
      billingZipCode: true,
      billingStreet: true,
      billingNumber: true,
      billingComplement: true,
      billingNeighborhood: true,
      billingCity: true,
      billingState: true,
    },
  })

  // Construir URL de retorno para o step anterior
  const configureParams = new URLSearchParams({ plan: plan || '' })
  const configureUrl = `/org/${orgSlug}/checkout/configure?${configureParams.toString()}`

  // Construir URL para o próximo step
  const paymentParams = new URLSearchParams({
    plan: plan || '',
    interval: interval || 'monthly',
    seats: seats || '1',
  })
  const nextUrl = `/org/${orgSlug}/checkout/payment?${paymentParams.toString()}`

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">
        Dados cadastrais
      </h1>
      <p className="mb-8 text-muted-foreground">
        Preencha os dados de faturamento da sua organização.
      </p>

      <RegisterForm
        defaultValues={org}
        nextUrl={nextUrl}
        backUrl={configureUrl}
      />
    </div>
  )
}
