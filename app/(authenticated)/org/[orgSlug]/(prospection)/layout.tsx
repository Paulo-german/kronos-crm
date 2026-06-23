import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
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
  const { orgId } = await getOrgContext(orgSlug)

  // Gating de módulo: Prospection é um produto à parte; sem acesso, redireciona
  // para o billing (mesma política do CRM/Inbox/Agents).
  const hasAccess = await hasModuleAccess(orgId, 'prospection')
  if (!hasAccess) {
    redirect(`/org/${orgSlug}/settings/billing`)
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
