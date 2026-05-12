'use client'

import type { ServiceDto } from '@/_data-access/service/get-services'
import type { ServiceCategoryDto } from '@/_data-access/service/get-service-categories'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'
import { ServicesListClient } from '../../services/_components/services-list-client'

interface ServicesTabProps {
  services: ServiceDto[]
  categories: ServiceCategoryDto[]
  professionals: ProfessionalDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function ServicesTab({
  services,
  categories,
  professionals,
  page,
  pageSize,
  total,
  totalPages,
}: ServicesTabProps) {
  return (
    <ServicesListClient
      services={services}
      categories={categories}
      professionals={professionals}
      page={page}
      pageSize={pageSize}
      total={total}
      totalPages={totalPages}
    />
  )
}
