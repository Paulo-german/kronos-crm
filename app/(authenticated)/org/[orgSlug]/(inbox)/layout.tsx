import { ProductLayoutBase } from '@/_components/layout/product-layout-base'
import { InboxSidebar } from '@/_components/layout/sidebars/inbox-sidebar'

interface InboxLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const InboxLayout = async ({ children, params }: InboxLayoutProps) => {
  const { orgSlug } = await params
  return (
    <ProductLayoutBase
      orgSlug={orgSlug}
      product="inbox"
      sidebar={<InboxSidebar orgSlug={orgSlug} />}
    >
      {children}
    </ProductLayoutBase>
  )
}

export default InboxLayout
