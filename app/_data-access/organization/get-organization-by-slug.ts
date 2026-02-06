import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

async function fetchOrganizationBySlug(slug: string) {
  return db.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      // Dados Cadastrais
      personType: true,
      taxId: true,
      legalName: true,
      tradeName: true,
      isSimples: true,
      // Contato Financeiro
      billingContactName: true,
      billingContactEmail: true,
      billingContactPhone: true,
      // Endereço de Faturamento
      billingZipCode: true,
      billingStreet: true,
      billingNumber: true,
      billingComplement: true,
      billingNeighborhood: true,
      billingCity: true,
      billingState: true,
      billingCountry: true,
    },
  })
}

export const getOrganizationBySlug = cache(async (slug: string) => {
  const getCachedOrganization = unstable_cache(
    async () => fetchOrganizationBySlug(slug),
    [`organization-slug-${slug}`],
    {
      tags: [`organization:${slug}`],
      revalidate: 3600,
    },
  )
  return getCachedOrganization()
})
