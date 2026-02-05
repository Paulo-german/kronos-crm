'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

const deleteContactSchema = z.object({
  id: z.string().uuid(),
})

export const deleteContact = orgActionClient
  .schema(deleteContactSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    // 1. Verificar permissão base (apenas ADMIN/OWNER podem deletar)
    requirePermission(canPerformAction(ctx, 'contact', 'delete'))

    // 2. Verificar se o contato existe e pertence à organização
    const contact = await db.contact.findFirst({
      where: {
        id,
        organizationId: ctx.orgId,
      },
    })

    if (!contact) {
      throw new Error('Contato não encontrado.')
    }

    await db.contact.delete({
      where: { id },
    })

    revalidateTag(`contacts:${ctx.orgId}`)
    revalidatePath('/contacts')

    return { success: true }
  })
