import { cache } from 'react'
import { getUserOrganizations } from '@/_data-access/organization/get-user-organizations'
import { getOrgModules } from '@/_data-access/module/get-org-modules'
import type { MemberRole } from '@prisma/client'

export interface OrgWithModules {
  id: string
  name: string
  slug: string
  role: MemberRole
  grantType: string | null
  activeModules: string[]
}

/**
 * Retorna as organizações do usuário com os módulos ativos de cada uma.
 *
 * Compõe dois caches independentes já existentes:
 *   - getUserOrganizations  → tag user-orgs:${userId}   (invalida em membership changes)
 *   - getOrgModules         → tag modules:${orgId}       (invalida em subscription/plano changes)
 *
 * Por isso NÃO usa unstable_cache próprio: a invalidação acontece automaticamente quando
 * qualquer uma das partes for revalidada, sem precisar de uma tag composta órfã.
 * O React.cache() garante dedup dentro do mesmo request.
 */
export const getUserOrganizationsWithModules = cache(async (userId: string): Promise<OrgWithModules[]> => {
  const orgs = await getUserOrganizations(userId)

  const orgsWithModules = await Promise.all(
    orgs.map(async (org) => {
      const modules = await getOrgModules(org.id)
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: org.role,
        grantType: null, // getUserOrganizations não expõe grantType — mantém null como default seguro
        activeModules: modules.map((mod) => mod.slug),
      }
    }),
  )

  return orgsWithModules
})
