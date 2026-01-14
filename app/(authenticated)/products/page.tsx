import { createClient } from '@/_lib/supabase/server'
import { getProducts } from '@/_data-access/product/get-products'
import { ProductsDataTable } from '@/(authenticated)/products/_components/products-data-table'
import CreateProductButton from '@/(authenticated)/products/_components/create-product-button'

const ProductsPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const products = await getProducts(user.id)

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
