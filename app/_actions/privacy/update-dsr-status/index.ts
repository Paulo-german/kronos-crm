'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import { updateDsrStatusSchema } from './schema'

const RESOLVED_STATUSES = new Set(['COMPLETED', 'REJECTED'])

export const updateDsrStatus = orgActionClient
  .schema(updateDsrStatusSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    if (!isElevated(ctx.userRole)) {
      throw new Error('Apenas administradores podem atualizar solicitações de DSR.')
    }

    const request = await db.dsrRequest.findFirst({
      where: { id: data.dsrRequestId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!request) {
      throw new Error('Solicitação não encontrada ou não pertence à organização.')
    }

    const isResolved = RESOLVED_STATUSES.has(data.status)

    await db.dsrRequest.update({
      where: { id: data.dsrRequestId },
      data: {
        status: data.status,
        notes: data.notes ?? undefined,
        ...(isResolved
          ? { resolvedBy: ctx.userId, resolvedAt: new Date() }
          : { resolvedBy: null, resolvedAt: null }),
      },
    })

    revalidateTag(`dsr-requests:${ctx.orgId}`)

    return { success: true }
  })
