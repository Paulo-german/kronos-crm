import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOnboardingStatus } from '@/_data-access/organization/get-onboarding-status'
import { OnboardingWizardClient } from './_components/onboarding-wizard-client'

interface OnboardingPageProps {
  params: Promise<{ orgSlug: string }>
}

const OnboardingPage = async ({ params }: OnboardingPageProps) => {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)
  const status = await getOnboardingStatus(orgId)

  if (status.onboardingCompleted) {
    redirect(`/org/${orgSlug}/dashboard`)
  }

  return <OnboardingWizardClient initialStatus={status} orgSlug={orgSlug} />
}

export default OnboardingPage
