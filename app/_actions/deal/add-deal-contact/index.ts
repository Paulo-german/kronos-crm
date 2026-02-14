'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { addDealContactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  findDealWithRBAC,
  findContactWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'

export const addDealContact = orgActionClient
  .schema(addDealContactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Verificar se o contato é acessível pelo usuário (MEMBER só pode vincular próprios contatos)
    const contact = await findContactWithRBAC(data.contactId, ctx)

    await db.$transaction(async (tx) => {
      // 4. Se for definir como primary, remove status dos outros
      if (data.isPrimary) {
        await tx.dealContact.updateMany({
          where: { dealId: data.dealId, isPrimary: true },
          data: { isPrimary: false },
        })
      }

      await tx.dealContact.create({
        data: {
          dealId: data.dealId,
          contactId: data.contactId,
          role: data.role,
          isPrimary: data.isPrimary,
        },
      })

      // 5. Log da atividade
      await tx.activity.create({
        data: {
          dealId: data.dealId,
          type: 'contact_added',
          content: `Adicionou ${contact.name}${data.role ? ` como ${data.role}` : ''}${data.isPrimary ? ' (Contato Principal)' : ''}`,
          performedBy: ctx.userId,
        },
      })
    })

    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)

    return { success: true }
  })
