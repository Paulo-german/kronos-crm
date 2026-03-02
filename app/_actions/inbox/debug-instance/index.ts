'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { debugEvolutionInstance, buildWebhookUrl } from '@/_lib/evolution/instance-management'

const debugInstanceSchema = z.object({
  inboxId: z.string().uuid(),
})

export const debugInstance = orgActionClient
  .schema(debugInstanceSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { evolutionInstanceName: true },
    })

    if (!inbox?.evolutionInstanceName) {
      throw new Error('Inbox sem instância Evolution conectada.')
    }

    const debug = await debugEvolutionInstance(inbox.evolutionInstanceName)

    return {
      instanceName: inbox.evolutionInstanceName,
      expectedWebhookUrl: buildWebhookUrl(),
      ...debug,
    }
  })
