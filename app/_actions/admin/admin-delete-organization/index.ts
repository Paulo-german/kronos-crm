'use server'

import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { adminDeleteOrganizationSchema } from './schema'
import { revalidateTag } from 'next/cache'

export const adminDeleteOrganization = superAdminActionClient
  .schema(adminDeleteOrganizationSchema)
  .action(async ({ parsedInput: { organizationId, adminKey, confirmName } }) => {
    const superAdminKey = process.env.SUPER_ADMIN_KEY
    if (!superAdminKey || adminKey !== superAdminKey) {
      throw new Error('Senha incorreta.')
    }

    const organization = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        name: true,
        slug: true,
        members: { select: { userId: true } },
      },
    })

    if (confirmName !== organization.name) {
      throw new Error('Nome não confere com o da organização.')
    }

    await db.organization.delete({ where: { id: organizationId } })

    // Invalidar cache da org e de cada membro que tinha acesso a ela
    revalidateTag(`organization:${organization.slug}`)
    for (const member of organization.members) {
      revalidateTag(`user-orgs:${member.userId}`)
    }

    return { success: true }
  })
