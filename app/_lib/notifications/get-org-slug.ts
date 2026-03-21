import 'server-only'
import { db } from '@/_lib/prisma'

/**
 * Busca o slug de uma organizacao pelo seu ID.
 * Usado pelas actions para construir actionUrl nas notificacoes,
 * ja que o orgActionClient nao expoe o slug no ctx.
 */
export async function getOrgSlug(orgId: string): Promise<string> {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { slug: true },
  })
  return org.slug
}
