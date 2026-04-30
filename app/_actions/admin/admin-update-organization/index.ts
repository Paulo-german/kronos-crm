'use server'

import { revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { adminUpdateOrganizationSchema } from './schema'

export const adminUpdateOrganization = superAdminActionClient
  .schema(adminUpdateOrganizationSchema)
  .action(async ({ parsedInput: { organizationId, adminKey, name, slug, niche, isReadOnly, planOverrideId } }) => {
    const superAdminKey = process.env.SUPER_ADMIN_KEY
    if (!superAdminKey || adminKey !== superAdminKey) {
      throw new Error('Senha incorreta.')
    }

    const org = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { slug: true },
    })

    const oldSlug = org.slug

    if (slug !== oldSlug) {
      const slugInUse = await db.organization.findUnique({
        where: { slug },
        select: { id: true },
      })
      if (slugInUse) throw new Error('Slug já está em uso por outra organização.')
    }

    if (planOverrideId) {
      await db.plan.findUniqueOrThrow({ where: { id: planOverrideId } })
    }

    await db.organization.update({
      where: { id: organizationId },
      data: {
        name,
        slug,
        niche: niche || null,
        isReadOnly,
        planOverrideId: planOverrideId ?? null,
      },
    })

    revalidateTag(`organization:${oldSlug}`)
    if (slug !== oldSlug) revalidateTag(`organization:${slug}`)

    return { success: true }
  })
