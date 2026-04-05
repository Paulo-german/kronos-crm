import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOnboardingStatus } from '@/_data-access/organization/get-onboarding-status'
import { getTrialStatus } from '@/_data-access/billing/get-trial-status'
import { OnboardingWizardClient } from './_components/onboarding-wizard-client'

interface OnboardingPageProps {
  params: Promise<{ orgSlug: string }>
}

const OnboardingPage = async ({ params }: OnboardingPageProps) => {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)

  const [status, trialStatus] = await Promise.all([
    getOnboardingStatus(orgId),
    getTrialStatus(orgId),
  ])

  // Sem plano ativo: redirecionar direto para /plans (evita loop via dashboard)
  // O onboarding só deve ser acessível após o pagamento
  if (trialStatus.isExpired) {
    redirect(`/org/${orgSlug}/plans`)
  }

  if (status.onboardingCompleted) {
    redirect(`/org/${orgSlug}/dashboard`)
  }

  return <OnboardingWizardClient initialStatus={status} orgSlug={orgSlug} />
}

export default OnboardingPage
