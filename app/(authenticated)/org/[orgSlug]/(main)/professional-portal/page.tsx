import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireProfessionalContext } from '@/_lib/rbac'
import { getProfessionalById } from '@/_data-access/professional/get-professional-by-id'
import { getProfessionalAppointments } from '@/_data-access/professional/get-professional-appointments'
import { getOrganizationBySlug } from '@/_data-access/organization/get-organization-by-slug'
import { ProfessionalPortalView } from './_components/professional-portal-view'

interface ProfessionalPortalPageProps {
  params: Promise<{ orgSlug: string }>
}

const ProfessionalPortalPage = async ({ params }: ProfessionalPortalPageProps) => {
  const { orgSlug } = await params
  const requestHeaders = await headers()

  const userId = requestHeaders.get('x-user-id')

  if (!userId) {
    redirect(`/login?next=/org/${orgSlug}/professional-portal`)
  }

  const org = await getOrganizationBySlug(orgSlug)

  if (!org) {
    redirect('/org')
  }

  const orgId = org.id

  let professionalId: string
  try {
    const ctx = await requireProfessionalContext(userId, orgId)
    professionalId = ctx.professionalId
  } catch {
    redirect(`/org/${orgSlug}/home`)
  }

  const [professional, appointments] = await Promise.all([
    getProfessionalById(professionalId, orgId),
    getProfessionalAppointments(professionalId, orgId),
  ])

  if (!professional) {
    redirect(`/org/${orgSlug}/home`)
  }

  return (
    <ProfessionalPortalView
      professional={professional}
      appointments={appointments}
      orgSlug={orgSlug}
    />
  )
}

export default ProfessionalPortalPage
