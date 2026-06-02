import { ProductLayoutBase } from '@/_components/layout/product-layout-base'
import { AgentsSidebar } from '@/_components/layout/sidebars/agents-sidebar'

interface AgentsLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const AgentsLayout = async ({ children, params }: AgentsLayoutProps) => {
  const { orgSlug } = await params
  return (
    <ProductLayoutBase
      orgSlug={orgSlug}
      product="agents"
      sidebar={<AgentsSidebar orgSlug={orgSlug} />}
      withCredits
    >
      {children}
    </ProductLayoutBase>
  )
}

export default AgentsLayout
