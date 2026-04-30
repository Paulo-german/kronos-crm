'use server'

import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { adminDeleteOrganizationSchema } from './schema'

export const adminDeleteOrganization = superAdminActionClient
  .schema(adminDeleteOrganizationSchema)
  .action(async ({ parsedInput: { organizationId, adminKey, confirmName } }) => {
    const superAdminKey = process.env.SUPER_ADMIN_KEY
    if (!superAdminKey || adminKey !== superAdminKey) {
      throw new Error('Senha incorreta.')
    }

    const organization = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true },
    })

    if (confirmName !== organization.name) {
      throw new Error('Nome não confere com o da organização.')
    }

    await db.organization.delete({ where: { id: organizationId } })

    return { success: true }
  })
