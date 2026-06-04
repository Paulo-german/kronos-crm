import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { requireProfessionalContext } from '@/_lib/rbac/professional-guards'
import { getProfessionalById } from '@/_data-access/professional/get-professional-by-id'
import { getProfessionalAppointments } from '@/_data-access/professional/get-professional-appointments'
import { getOrganizationBySlug } from '@/_data-access/organization/get-organization-by-slug'
import { ProfessionalPortalView } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/professional-portal/_components/professional-portal-view'

interface ProfessionalPortalPageProps {
  params: Promise<{ orgSlug: string }>
}

const ProfessionalPortalPage = async ({ params }: ProfessionalPortalPageProps) => {
  const { orgSlug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/org/${orgSlug}/crm/professional-portal`)
  }

  const org = await getOrganizationBySlug(orgSlug)

  if (!org) {
    redirect('/org')
  }

  let professionalId: string
  try {
    const ctx = await requireProfessionalContext(user.id, org.id)
    professionalId = ctx.professionalId
  } catch {
    redirect(`/org/${orgSlug}/crm/home`)
  }

  const [professional, appointments] = await Promise.all([
    getProfessionalById(professionalId, org.id),
    getProfessionalAppointments(professionalId, org.id),
  ])

  if (!professional) {
    redirect(`/org/${orgSlug}/crm/home`)
  }

  return <ProfessionalPortalView professional={professional} appointments={appointments} />
}

export default ProfessionalPortalPage
