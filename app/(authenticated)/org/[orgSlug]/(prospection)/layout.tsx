import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getUserById } from '@/_data-access/user/get-user-by-id'
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
  const { userId } = await getOrgContext(orgSlug)

  // Prospection ainda não está liberado ao público: acesso restrito a superadmin.
  // Os demais usuários veem "EM BREVE" no switcher e não podem entrar via URL.
  const user = await getUserById(userId)
  if (!user?.isSuperAdmin) {
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
