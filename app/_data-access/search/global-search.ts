import 'server-only'
import { db } from '@/_lib/prisma'
import { GlobalSearchResult, SearchResultItem } from '@/_data-access/search/types'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

const LIMITS = {
  deals: 5,
  contacts: 3,
  companies: 2,
}

/**
 * Busca global em contatos, empresas e deals
 * RBAC: MEMBER só vê registros atribuídos a ele (contatos e deals)
 */
export const globalSearch = async (
  ctx: RBACContext,
  query: string,
): Promise<GlobalSearchResult> => {
  const searchTerm = query.trim().toLowerCase()

  const [contacts, companies, deals] = await Promise.all([
    // Search contacts by name, email, or phone
    db.contact.findMany({
      where: {
        organizationId: ctx.orgId,
        // RBAC: MEMBER só vê próprios
        ...(isElevated(ctx.userRole) ? {} : { assignedTo: ctx.userId }),
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: {
          select: { name: true },
        },
      },
      take: LIMITS.contacts,
      orderBy: { name: 'asc' },
    }),

    // Search companies by name (empresas são globais na org)
    db.company.findMany({
      where: {
        organizationId: ctx.orgId,
        name: { contains: searchTerm, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        industry: true,
      },
      take: LIMITS.companies,
      orderBy: { name: 'asc' },
    }),

    // Search deals by title or contact name
    db.deal.findMany({
      where: {
        organizationId: ctx.orgId,
        // RBAC: MEMBER só vê próprios
        ...(isElevated(ctx.userRole) ? {} : { assignedTo: ctx.userId }),
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          {
            contacts: {
              some: {
                contact: {
                  name: { contains: searchTerm, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        stage: {
          select: { name: true },
        },
        contacts: {
          where: { isPrimary: true },
          take: 1,
          select: {
            contact: {
              select: { name: true },
            },
          },
        },
      },
      take: LIMITS.deals,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const contactResults: SearchResultItem[] = contacts.map((contact) => ({
    id: contact.id,
    type: 'contact',
    title: contact.name,
    subtitle: contact.company?.name || contact.email || null,
    href: `/contacts`,
  }))

  const companyResults: SearchResultItem[] = companies.map((company) => ({
    id: company.id,
    type: 'company',
    title: company.name,
    subtitle: company.industry || null,
    href: `/contacts?company=${company.id}`,
  }))

  const dealResults: SearchResultItem[] = deals.map((deal) => ({
    id: deal.id,
    type: 'deal',
    title: deal.title,
    subtitle:
      deal.contacts[0]?.contact?.name || deal.stage?.name || null,
    href: `/crm/deals/${deal.id}`,
  }))

  return {
    contacts: contactResults,
    companies: companyResults,
    deals: dealResults,
    totalCount:
      contactResults.length + companyResults.length + dealResults.length,
  }
}
