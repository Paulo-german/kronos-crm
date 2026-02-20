import 'server-only'
import { getOrgModules } from './get-org-modules'
import type { ModuleSlug } from './types'

/**
 * Verifica se a organização tem acesso a um módulo específico.
 */
export async function hasModuleAccess(
  orgId: string,
  moduleSlug: ModuleSlug,
): Promise<boolean> {
  const modules = await getOrgModules(orgId)
  return modules.some((mod) => mod.slug === moduleSlug)
}
