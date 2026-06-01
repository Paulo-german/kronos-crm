'use server'

import { revalidateTag } from 'next/cache'
import { freeOrgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { updatePrivacyPolicyUrlSchema } from './schema'

export const updatePrivacyPolicyUrl = freeOrgActionClient
  .schema(updatePrivacyPolicyUrlSchema)
  .action(async ({ parsedInput: { privacyPolicyUrl }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    const normalizedUrl = privacyPolicyUrl || null

    await db.organization.update({
      where: { id: ctx.orgId },
      data: { privacyPolicyUrl: normalizedUrl },
    })

    revalidateTag(`organization:${ctx.orgSlug}`)

    // O DTO público de cada form embute a privacyPolicyUrl da org. Cada form tem
    // token próprio, então invalidamos a tag de cada token para evitar dados stale.
    const forms = await db.captureForm.findMany({
      where: { organizationId: ctx.orgId },
      select: { publicToken: true },
    })
    for (const form of forms) {
      revalidateTag(`capture-form-token:${form.publicToken}`)
    }

    return { success: true, privacyPolicyUrl: normalizedUrl }
  })
