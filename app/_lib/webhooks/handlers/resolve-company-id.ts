import { db } from '@/_lib/prisma'

// Find-or-create de empresa por nome dentro da org — compartilhado pelos handlers de contato
export async function resolveCompanyId(
  orgId: string,
  companyName: string | null,
): Promise<string | null> {
  if (!companyName) return null

  const existing = await db.company.findFirst({
    where: { organizationId: orgId, name: companyName },
    select: { id: true },
  })

  if (existing) return existing.id

  const created = await db.company.create({
    data: { organizationId: orgId, name: companyName },
    select: { id: true },
  })

  return created.id
}
