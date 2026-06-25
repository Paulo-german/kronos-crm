import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { hasModuleAccess } from '@/_data-access/module/check-module-access'
import { ProductLayoutBase } from '@/_components/layout/product-layout-base'
import { ProspectionSidebar } from '@/_components/layout/sidebars/prospection-sidebar'

interface ProspectionLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const ProspectionLayout = async ({
  children,
  params,
}: ProspectionLayoutProps) => {
  const { orgSlug } = await params
  const { userId, orgId } = await getOrgContext(orgSlug)

  // Prospection é um módulo de plano (Scale+). Quem não tem o módulo vê o badge
  // "SCALE" no switcher e não pode entrar via URL. Superadmin sempre entra (teste).
  const [hasAccess, user] = await Promise.all([
    hasModuleAccess(orgId, 'prospection'),
    getUserById(userId),
  ])
  if (!hasAccess && !user?.isSuperAdmin) {
    redirect(`/org/${orgSlug}/crm/home`)
  }

  return (
    <ProductLayoutBase
      orgSlug={orgSlug}
      product="prospection"
      sidebar={<ProspectionSidebar orgSlug={orgSlug} />}
    >
      {children}
    </ProductLayoutBase>
  )
}

export default ProspectionLayout
