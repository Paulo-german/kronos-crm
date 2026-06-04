import type { ProductDto } from '@/_data-access/product/get-products'
import { ProductsListClient } from './product/products-list-client'

interface ProductsTabProps {
  products: ProductDto[]
  withinQuota: boolean
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function ProductsTab({ products, withinQuota, page, pageSize, total, totalPages }: ProductsTabProps) {
  return (
    <ProductsListClient
      products={products}
      withinQuota={withinQuota}
      page={page}
      pageSize={pageSize}
      total={total}
      totalPages={totalPages}
    />
  )
}
