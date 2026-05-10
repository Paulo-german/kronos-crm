import { redirect } from 'next/navigation'

import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getProfessionalById } from '@/_data-access/professional/get-professional-by-id'
import { getServices } from '@/_data-access/service/get-services'

import ProfessionalDetailClient from './_components/professional-detail-client'

interface ProfessionalDetailPageProps {
  params: Promise<{ orgSlug: string; id: string }>
}

const ProfessionalDetailPage = async ({ params }: ProfessionalDetailPageProps) => {
  const { orgSlug, id } = await params
  const ctx = await getOrgContext(orgSlug)

  if (
    ctx.userRole !== 'OWNER' &&
    ctx.userRole !== 'ADMIN' &&
    ctx.userRole !== 'SUPPORT'
  ) {
    redirect(`/org/${orgSlug}/settings/professionals`)
  }

  const [professional, services] = await Promise.all([
    getProfessionalById(id, ctx.orgId),
    getServices(ctx.orgId, true),
  ])

  if (!professional) {
    redirect(`/org/${orgSlug}/settings/professionals`)
  }

  return (
    <ProfessionalDetailClient
      professional={professional}
      services={services}
      orgSlug={orgSlug}
      userRole={ctx.userRole}
    />
  )
}

export default ProfessionalDetailPage
