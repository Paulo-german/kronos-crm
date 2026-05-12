'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import type { ProductDto } from '@/_data-access/product/get-products'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { ServiceCategoryDto } from '@/_data-access/service/get-service-categories'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'
import type { PromotionDto } from '@/_data-access/promotion/get-promotions'

import { ProductsTab } from './products-tab'
import { ServicesTab } from './services-tab'
import { PromotionsTab } from './promotions-tab'

interface CatalogTabsProps {
  products: ProductDto[]
  productsPage: number
  productsPageSize: number
  productsTotal: number
  productsTotalPages: number
  services: ServiceDto[]
  servicesPage: number
  servicesPageSize: number
  servicesTotal: number
  servicesTotalPages: number
  categories: ServiceCategoryDto[]
  professionals: ProfessionalDto[]
  promotions: PromotionDto[]
  promotionsPage: number
  promotionsPageSize: number
  promotionsTotal: number
  promotionsTotalPages: number
  productQuota: boolean
}

export function CatalogTabs({
  products,
  productsPage,
  productsPageSize,
  productsTotal,
  productsTotalPages,
  services,
  servicesPage,
  servicesPageSize,
  servicesTotal,
  servicesTotalPages,
  categories,
  professionals,
  promotions,
  promotionsPage,
  promotionsPageSize,
  promotionsTotal,
  promotionsTotalPages,
  productQuota,
}: CatalogTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = searchParams.get('tab') ?? 'products'

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    // Limpa todos os params de paginação/filtro ao trocar de tab
    params.delete('page')
    params.delete('search')
    params.delete('categoryId')
    params.delete('status')
    params.delete('p_page')
    params.delete('p_pageSize')
    params.delete('p_search')
    params.delete('p_status')
    params.delete('pr_page')
    params.delete('pr_pageSize')
    params.delete('pr_search')
    params.delete('pr_status')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="grid h-12 w-full grid-cols-3 rounded-md border border-border/50 bg-tab/30">
        <TabsTrigger
          value="products"
          className="rounded-md py-2 data-[state=active]:bg-card/80"
        >
          Produtos
        </TabsTrigger>
        <TabsTrigger
          value="services"
          className="rounded-md py-2 data-[state=active]:bg-card/80"
        >
          Serviços
        </TabsTrigger>
        <TabsTrigger
          value="promotions"
          className="rounded-md py-2 data-[state=active]:bg-card/80"
        >
          Promoções
        </TabsTrigger>
      </TabsList>

      <TabsContent value="products" className="mt-6">
        <ProductsTab
          products={products}
          withinQuota={productQuota}
          page={productsPage}
          pageSize={productsPageSize}
          total={productsTotal}
          totalPages={productsTotalPages}
        />
      </TabsContent>

      <TabsContent value="services" className="mt-6">
        <ServicesTab
          services={services}
          categories={categories}
          professionals={professionals}
          page={servicesPage}
          pageSize={servicesPageSize}
          total={servicesTotal}
          totalPages={servicesTotalPages}
        />
      </TabsContent>

      <TabsContent value="promotions" className="mt-6">
        <PromotionsTab
          promotions={promotions}
          products={products}
          services={services}
          page={promotionsPage}
          pageSize={promotionsPageSize}
          total={promotionsTotal}
          totalPages={promotionsTotalPages}
        />
      </TabsContent>
    </Tabs>
  )
}
