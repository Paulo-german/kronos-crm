import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import { getDealLineItems } from '@/_data-access/deal/get-deal-line-items'
import { getProducts } from '@/_data-access/product/get-products'
import { getServices } from '@/_data-access/service/get-services'
import { getPromotions } from '@/_data-access/promotion/get-promotions'
import type { RBACContext } from '@/_lib/rbac'
import TabProducts from './tab-products'

interface TabProductsServerProps {
  deal: DealDetailsDto
  ctx: RBACContext
}

const TabProductsServer = async ({ deal, ctx }: TabProductsServerProps) => {
  const [{ lineItems, totalValue }, products, services, promotions] =
    await Promise.all([
      getDealLineItems(deal.id, ctx),
      getProducts(ctx.orgId),
      getServices(ctx.orgId, false),
      getPromotions(ctx.orgId),
    ])

  return (
    <TabProducts
      deal={deal}
      lineItems={lineItems}
      totalValue={totalValue}
      products={products}
      services={services}
      promotions={promotions}
    />
  )
}

export default TabProductsServer
