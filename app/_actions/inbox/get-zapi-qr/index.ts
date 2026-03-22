'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getZApiQRCode } from '@/_lib/zapi/instance-info'
import { getZApiQRSchema } from './schema'

export const getZApiQR = orgActionClient
  .schema(getZApiQRSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'read'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: {
        zapiInstanceId: true,
        zapiToken: true,
        zapiClientToken: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (!inbox.zapiInstanceId || !inbox.zapiToken || !inbox.zapiClientToken) {
      throw new Error('Esta caixa de entrada não possui credenciais Z-API configuradas.')
    }

    const result = await getZApiQRCode({
      instanceId: inbox.zapiInstanceId,
      token: inbox.zapiToken,
      clientToken: inbox.zapiClientToken,
    })

    return {
      base64: result.base64,
      connected: result.connected,
    }
  })
