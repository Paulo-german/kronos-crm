'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateDealSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  canPerformAction,
  canAccessRecord,
  canTransferOwnership,
  requirePermission,
  isOwnershipChange,
} from '@/_lib/rbac'

export const updateDeal = orgActionClient
  .schema(updateDealSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal existente
    const deal = await db.deal.findFirst({
      where: {
        id: data.id,
        organizationId: ctx.orgId,
      },
    })

    if (!deal) {
      throw new Error('Negócio não encontrado.')
    }

    // 3. Verificar acesso ao registro (MEMBER só edita próprios)
    requirePermission(canAccessRecord(ctx, { assignedTo: deal.assignedTo }))

    // 4. Se está mudando assignedTo, verificar permissão de transferência
    if (isOwnershipChange(data.assignedTo, deal.assignedTo)) {
      requirePermission(canTransferOwnership(ctx))

      // Transferir também os contatos vinculados ao Deal
      if (data.assignedTo) {
        // Buscar todos os contatos vinculados a este Deal
        const dealContacts = await db.dealContact.findMany({
          where: { dealId: data.id },
          select: { contactId: true },
        })

        // Atualizar o assignedTo de todos os contatos vinculados
        if (dealContacts.length > 0) {
          await db.contact.updateMany({
            where: {
              id: { in: dealContacts.map((dc) => dc.contactId) },
              organizationId: ctx.orgId, // Garantir que são da mesma org
            },
            data: {
              assignedTo: data.assignedTo,
            },
          })
        }
      }
    }

    // 5. Validações de contato e empresa
    const contact = data.contactId
      ? await db.contact.findFirst({
          where: {
            id: data.contactId,
            organizationId: ctx.orgId,
          },
        })
      : null

    if (data.contactId && !contact) {
      throw new Error('Contato não encontrado.')
    }

    if (data.companyId) {
      const company = await db.company.findFirst({
        where: {
          id: data.companyId,
          organizationId: ctx.orgId,
        },
      })
      if (!company) {
        throw new Error('Empresa não encontrada.')
      }
    }

    // Handle Contact Update (N:N)
    if (typeof data.contactId !== 'undefined') {
      await db.dealContact.updateMany({
        where: { dealId: data.id, isPrimary: true },
        data: { isPrimary: false },
      })

      if (data.contactId) {
        await db.dealContact.upsert({
          where: {
            dealId_contactId: {
              dealId: data.id,
              contactId: data.contactId,
            },
          },
          create: {
            dealId: data.id,
            contactId: data.contactId,
            isPrimary: true,
            role: contact?.role,
          },
          update: {
            isPrimary: true,
          },
        })
      }
    }

    // Build update data using relation-based approach for companyId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.expectedCloseDate !== undefined)
      updateData.expectedCloseDate = data.expectedCloseDate
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo

    // Handle company relation properly to avoid Prisma type conflicts
    if (data.companyId !== undefined) {
      if (data.companyId === null) {
        updateData.company = { disconnect: true }
      } else {
        updateData.company = { connect: { id: data.companyId } }
      }
    }

    await db.deal.update({
      where: { id: data.id },
      data: updateData,
    })

    revalidatePath('/pipeline')
    revalidatePath('/contacts') // Contatos também foram atualizados
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`contacts:${ctx.orgId}`) // Invalidar cache de contatos

    return { success: true }
  })
