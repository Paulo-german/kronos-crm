'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { saveNicheSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { BLUEPRINTS } from '@/_lib/onboarding/blueprints'

export const saveNiche = orgActionClient
  .schema(saveNicheSchema)
  .action(async ({ parsedInput: { niche }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    const validNiche = BLUEPRINTS.find((blueprint) => blueprint.key === niche)
    if (!validNiche) {
      throw new Error('Segmento inválido.')
    }

    const org = await db.organization.update({
      where: { id: ctx.orgId },
      data: { niche },
      select: { slug: true },
    })

    revalidateTag(`onboarding:${ctx.orgId}`)
    revalidateTag(`organization:${org.slug}`)

    return { success: true, niche }
  })
