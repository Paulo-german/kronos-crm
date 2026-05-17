import 'server-only'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'

/**
 * Constrói cache key determinística para os data-access do Copiloto.
 *
 * O userId é incluído porque MEMBER vê apenas registros próprios — cachear
 * por orgId apenas faria com que um MEMBER recebesse dados de outro. O flag
 * elevated/hidePii entra na chave para evitar bleed-through entre roles que
 * compartilhem o mesmo userId em cenários de impersonation/SUPPORT.
 */
export function makeInsightsCacheKey(
  prefix: string,
  ctx: RBACContext,
  paramsKey: string,
): string[] {
  const elevated = isElevated(ctx.userRole)
  const hidePii = ctx.hidePiiFromMembers ?? false
  return [`insights-${prefix}-${ctx.orgId}-${ctx.userId}-${elevated}-${hidePii}-${paramsKey}`]
}
