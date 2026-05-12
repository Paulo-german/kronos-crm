'use client'

import { PromotionsListClient } from './promotions-list-client'
import type { PromotionDto } from '@/_data-access/promotion/get-promotions'
import type { ProductDto } from '@/_data-access/product/get-products'
import type { ServiceDto } from '@/_data-access/service/get-services'

interface PromotionsTabProps {
  promotions: PromotionDto[]
  products: ProductDto[]
  services: ServiceDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function PromotionsTab({
  promotions,
  products,
  services,
  page,
  pageSize,
  total,
  totalPages,
}: PromotionsTabProps) {
  return (
    <PromotionsListClient
      promotions={promotions}
      products={products}
      services={services}
      page={page}
      pageSize={pageSize}
      total={total}
      totalPages={totalPages}
    />
  )
}
