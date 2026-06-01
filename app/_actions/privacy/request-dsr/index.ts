'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import { requestDsrSchema } from './schema'

export const requestDsr = orgActionClient
  .schema(requestDsrSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    if (!isElevated(ctx.userRole)) {
      throw new Error('Apenas administradores podem registrar solicitações de DSR.')
    }

    // Validar que o contato (se informado) pertence à organização
    if (data.contactId) {
      const contact = await db.contact.findFirst({
        where: { id: data.contactId, organizationId: ctx.orgId },
        select: { id: true },
      })

      if (!contact) {
        throw new Error('Contato não encontrado ou não pertence à organização.')
      }
    }

    await db.dsrRequest.create({
      data: {
        organizationId: ctx.orgId,
        contactId: data.contactId ?? null,
        requestType: data.requestType,
        status: 'PENDING',
        requesterEmail: data.requesterEmail.toLowerCase().trim(),
        requesterName: data.requesterName ?? null,
        notes: data.notes ?? null,
      },
    })

    revalidateTag(`dsr-requests:${ctx.orgId}`)

    return { success: true }
  })
