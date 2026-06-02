import { ProductLayoutBase } from '@/_components/layout/product-layout-base'
import { CrmSidebar } from '@/_components/layout/sidebars/crm-sidebar'

interface CrmLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const CrmLayout = async ({ children, params }: CrmLayoutProps) => {
  const { orgSlug } = await params
  return (
    <ProductLayoutBase
      orgSlug={orgSlug}
      product="crm"
      sidebar={<CrmSidebar orgSlug={orgSlug} />}
      withCredits
      withWelcomeSurvey
      withDashboardTour
    >
      {children}
    </ProductLayoutBase>
  )
}

export default CrmLayout
