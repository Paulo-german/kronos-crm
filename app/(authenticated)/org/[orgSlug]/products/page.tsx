import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getProducts } from '@/_data-access/product/get-products'
import { ProductsDataTable } from './_components/products-data-table'
import CreateProductButton from './_components/create-product-button'

interface ProductsPageProps {
  params: Promise<{ orgSlug: string }>
}

const ProductsPage = async ({ params }: ProductsPageProps) => {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)

  const products = await getProducts(orgId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie seu catálogo de produtos.
          </p>
        </div>
        <CreateProductButton />
      </div>
      <ProductsDataTable products={products} />
    </div>
  )
}

export default ProductsPage
