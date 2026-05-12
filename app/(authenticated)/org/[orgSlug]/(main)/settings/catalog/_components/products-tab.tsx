'use client'

import type { ProductDto } from '@/_data-access/product/get-products'
import { ProductsDataTable } from '../../products/_components/products-data-table'
import CreateProductButton from '../../products/_components/create-product-button'

interface ProductsTabProps {
  products: ProductDto[]
  withinQuota: boolean
}

export function ProductsTab({ products, withinQuota }: ProductsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Produtos</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie seu catálogo de produtos.
          </p>
        </div>
        <CreateProductButton withinQuota={withinQuota} />
      </div>
      <ProductsDataTable products={products} />
    </div>
  )
}
