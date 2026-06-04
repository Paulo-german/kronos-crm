import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import { getProducts } from '@/_data-access/product/get-products'
import { getServices } from '@/_data-access/service/get-services'
import { getPromotions } from '@/_data-access/promotion/get-promotions'
import TabProducts from './tab-products'

interface TabProductsServerProps {
  deal: DealDetailsDto
  orgId: string
}

const TabProductsServer = async ({ deal, orgId }: TabProductsServerProps) => {
  const [products, services, promotions] = await Promise.all([
    getProducts(orgId),
    getServices(orgId, false),
    getPromotions(orgId),
  ])

  return (
    <TabProducts
      deal={deal}
      products={products}
      services={services}
      promotions={promotions}
    />
  )
}

export default TabProductsServer
