import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import { getProducts } from '@/_data-access/product/get-products'
import TabProducts from './tab-products'

interface TabProductsServerProps {
  deal: DealDetailsDto
  orgId: string
}

const TabProductsServer = async ({ deal, orgId }: TabProductsServerProps) => {
  const products = await getProducts(orgId)

  return <TabProducts deal={deal} products={products} />
}

export default TabProductsServer
