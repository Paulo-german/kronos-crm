import 'server-only'
import { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { maskEmail } from '@/_lib/pii-mask'
import type { GlobalSearchResult, SearchResultItem, SearchResultGroup } from '@/_data-access/search/types'
import {
  tokenizeQuery,
  looksLikeDocument,
  normalizeDocument,
} from '@/_data-access/search/search-utils'

const LIMITS = {
  contacts: 5,
  companies: 5,
  deals: 5,
}

// ─── Tipos para linhas brutas retornadas pelo $queryRaw ────────────────────────

interface RawContact {
  id: string
  name: string
  email: string | null
  company_name: string | null
}

interface RawCompany {
  id: string
  name: string
  industry: string | null
}

interface RawDeal {
  id: string
  title: string
  stage_name: string | null
  primary_contact_name: string | null
}

interface RawCountResult {
  count: bigint
}

// ─── Builders de fragmentos SQL para cada entidade ────────────────────────────

/**
 * Constrói as condições WHERE de tokens para a busca de contatos.
 * Cada token gera um bloco OR entre os campos pesquisáveis (AND entre tokens).
 * Quando masked: busca apenas por nome para não vazar PII via busca.
 */
function buildContactTokenConditions(
  tokens: string[],
  isDocumentQuery: boolean,
  masked: boolean,
): Prisma.Sql[] {
  return tokens.map((token) => {
    const pattern = `%${token}%`

    // MEMBER com toggle ativo: busca restrita ao nome para não vazar PII
    if (masked) {
      return Prisma.sql`(unaccent(c.name) ILIKE unaccent(${pattern}))`
    }

    if (isDocumentQuery) {
      // Busca por documento: inclui o campo cpf normalizado (sem pontos e traços)
      const normalizedPattern = `%${normalizeDocument(token)}%`
      return Prisma.sql`(
        unaccent(c.name) ILIKE unaccent(${pattern})
        OR unaccent(COALESCE(c.email, '')) ILIKE unaccent(${pattern})
        OR unaccent(COALESCE(c.phone, '')) ILIKE unaccent(${pattern})
        OR REPLACE(REPLACE(COALESCE(c.cpf, ''), '.', ''), '-', '') ILIKE ${normalizedPattern}
      )`
    }

    return Prisma.sql`(
      unaccent(c.name) ILIKE unaccent(${pattern})
      OR unaccent(COALESCE(c.email, '')) ILIKE unaccent(${pattern})
      OR unaccent(COALESCE(c.phone, '')) ILIKE unaccent(${pattern})
    )`
  })
}

/**
 * Constrói as condições WHERE de tokens para a busca de empresas.
 */
function buildCompanyTokenConditions(tokens: string[]): Prisma.Sql[] {
  return tokens.map((token) => {
    const pattern = `%${token}%`
    return Prisma.sql`(
      unaccent(co.name) ILIKE unaccent(${pattern})
      OR unaccent(COALESCE(co.domain, '')) ILIKE unaccent(${pattern})
    )`
  })
}

/**
 * Constrói as condições WHERE de tokens para a busca de deals.
 * Busca por título do deal OU nome de contato vinculado (via deal_contacts).
 */
function buildDealTokenConditions(tokens: string[]): Prisma.Sql[] {
  return tokens.map((token) => {
    const pattern = `%${token}%`
    return Prisma.sql`(
      unaccent(d.title) ILIKE unaccent(${pattern})
      OR EXISTS (
        SELECT 1 FROM deal_contacts dc
        JOIN contacts c ON c.id = dc.contact_id
        WHERE dc.deal_id = d.id
          AND unaccent(c.name) ILIKE unaccent(${pattern})
      )
    )`
  })
}

// ─── Queries principais por entidade ──────────────────────────────────────────

async function searchContacts(
  orgId: string,
  userId: string,
  elevated: boolean,
  tokens: string[],
  isDocumentQuery: boolean,
  masked: boolean,
): Promise<{ items: RawContact[]; totalCount: number }> {
  const tokenConditions = buildContactTokenConditions(tokens, isDocumentQuery, masked)
  const whereTokens = Prisma.join(tokenConditions, ' AND ')

  const rbacCondition = elevated
    ? Prisma.sql`TRUE`
    : Prisma.sql`c.assigned_to = ${userId}`

  const [items, countResult] = await Promise.all([
    db.$queryRaw<RawContact[]>(Prisma.sql`
      SELECT
        c.id,
        c.name,
        c.email,
        co.name AS company_name
      FROM contacts c
      LEFT JOIN companies co ON co.id = c.company_id
      WHERE c.organization_id = ${orgId}
        AND ${rbacCondition}
        AND (${whereTokens})
      ORDER BY c.name ASC
      LIMIT ${LIMITS.contacts}
    `),
    db.$queryRaw<RawCountResult[]>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM contacts c
      WHERE c.organization_id = ${orgId}
        AND ${rbacCondition}
        AND (${whereTokens})
    `),
  ])

  return {
    items,
    totalCount: Number(countResult[0]?.count ?? 0),
  }
}

async function searchCompanies(
  orgId: string,
  tokens: string[],
): Promise<{ items: RawCompany[]; totalCount: number }> {
  const tokenConditions = buildCompanyTokenConditions(tokens)
  const whereTokens = Prisma.join(tokenConditions, ' AND ')

  const [items, countResult] = await Promise.all([
    db.$queryRaw<RawCompany[]>(Prisma.sql`
      SELECT
        co.id,
        co.name,
        co.industry
      FROM companies co
      WHERE co.organization_id = ${orgId}
        AND (${whereTokens})
      ORDER BY co.name ASC
      LIMIT ${LIMITS.companies}
    `),
    db.$queryRaw<RawCountResult[]>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM companies co
      WHERE co.organization_id = ${orgId}
        AND (${whereTokens})
    `),
  ])

  return {
    items,
    totalCount: Number(countResult[0]?.count ?? 0),
  }
}

async function searchDeals(
  orgId: string,
  userId: string,
  elevated: boolean,
  tokens: string[],
): Promise<{ items: RawDeal[]; totalCount: number }> {
  const tokenConditions = buildDealTokenConditions(tokens)
  const whereTokens = Prisma.join(tokenConditions, ' AND ')

  const rbacCondition = elevated
    ? Prisma.sql`TRUE`
    : Prisma.sql`d.assigned_to = ${userId}`

  const [items, countResult] = await Promise.all([
    db.$queryRaw<RawDeal[]>(Prisma.sql`
      SELECT
        d.id,
        d.title,
        ps.name AS stage_name,
        (
          SELECT c.name
          FROM deal_contacts dc
          JOIN contacts c ON c.id = dc.contact_id
          WHERE dc.deal_id = d.id AND dc.is_primary = TRUE
          LIMIT 1
        ) AS primary_contact_name
      FROM deals d
      LEFT JOIN pipeline_stages ps ON ps.id = d.pipeline_stage_id
      WHERE d.organization_id = ${orgId}
        AND ${rbacCondition}
        AND (${whereTokens})
      ORDER BY d.created_at DESC
      LIMIT ${LIMITS.deals}
    `),
    db.$queryRaw<RawCountResult[]>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM deals d
      WHERE d.organization_id = ${orgId}
        AND ${rbacCondition}
        AND (${whereTokens})
    `),
  ])

  return {
    items,
    totalCount: Number(countResult[0]?.count ?? 0),
  }
}

// ─── Função pública de busca global ───────────────────────────────────────────

const EMPTY_GROUP: SearchResultGroup = { items: [], totalCount: 0 }

/**
 * Busca global em contatos, empresas e deals.
 * RBAC: MEMBER só vê registros atribuídos a ele (contacts e deals).
 * Companies são globais na org (qualquer membro vê todas).
 *
 * Usa raw SQL com `unaccent()` para busca sem acentos e tokenização AND
 * para que todas as palavras da query estejam presentes nos resultados.
 */
export async function globalSearch(
  ctx: RBACContext,
  query: string,
): Promise<GlobalSearchResult> {
  const tokens = tokenizeQuery(query)

  // Early return se não houver tokens válidos
  if (tokens.length === 0) {
    return {
      contacts: EMPTY_GROUP,
      companies: EMPTY_GROUP,
      deals: EMPTY_GROUP,
      totalCount: 0,
      query,
    }
  }

  const elevated = isElevated(ctx.userRole)
  const masked = !elevated && (ctx.hidePiiFromMembers ?? false)
  const isDocumentQuery = looksLikeDocument(query)

  // Todas as queries (incluindo resolução do slug) rodam em paralelo
  const [orgSlug, contactsResult, companiesResult, dealsResult] =
    await Promise.all([
      getOrgSlug(ctx.orgId),
      searchContacts(ctx.orgId, ctx.userId, elevated, tokens, isDocumentQuery, masked),
      searchCompanies(ctx.orgId, tokens),
      searchDeals(ctx.orgId, ctx.userId, elevated, tokens),
    ])

  const contactItems: SearchResultItem[] = contactsResult.items.map(
    (contact) => ({
      id: contact.id,
      type: 'contact',
      title: contact.name,
      // Quando masked: exibir empresa ou email parcialmente mascarado — nunca o valor real
      subtitle: masked
        ? (contact.company_name ?? maskEmail(contact.email) ?? null)
        : (contact.company_name ?? contact.email ?? null),
      href: `/org/${orgSlug}/contacts/${contact.id}`,
    }),
  )

  const companyItems: SearchResultItem[] = companiesResult.items.map(
    (company) => ({
      id: company.id,
      type: 'company',
      title: company.name,
      subtitle: company.industry ?? null,
      href: `/org/${orgSlug}/contacts?company=${company.id}`,
    }),
  )

  const dealItems: SearchResultItem[] = dealsResult.items.map((deal) => ({
    id: deal.id,
    type: 'deal',
    title: deal.title,
    subtitle: deal.primary_contact_name ?? deal.stage_name ?? null,
    href: `/org/${orgSlug}/crm/deals/${deal.id}`,
  }))

  const contacts: SearchResultGroup = {
    items: contactItems,
    totalCount: contactsResult.totalCount,
  }

  const companies: SearchResultGroup = {
    items: companyItems,
    totalCount: companiesResult.totalCount,
  }

  const deals: SearchResultGroup = {
    items: dealItems,
    totalCount: dealsResult.totalCount,
  }

  return {
    contacts,
    companies,
    deals,
    totalCount:
      contacts.totalCount + companies.totalCount + deals.totalCount,
    query,
  }
}
