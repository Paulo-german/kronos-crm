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

    // 4. Se for definir como primary, remove status dos outros
    let newAssigneeName = ''
    if (
      data.assignedTo &&
      deal.assignedTo !== data.assignedTo &&
      isOwnershipChange(data.assignedTo, deal.assignedTo)
    ) {
      requirePermission(canTransferOwnership(ctx))
      const newAssignee = await db.user.findUnique({
        where: { id: data.assignedTo },
        select: { fullName: true, email: true },
      })
      newAssigneeName = newAssignee?.fullName || newAssignee?.email || 'Usuário'
    }

    // 5. Build update data
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
        const company = await db.company.findFirst({
          where: { id: data.companyId, organizationId: ctx.orgId },
        })
        if (!company) throw new Error('Empresa não encontrada.')

        updateData.company = { connect: { id: data.companyId } }
      }
    }

    // Validação de contato
    let contactRole: string | undefined
    if (data.contactId) {
      const contact = await db.contact.findFirst({
        where: { id: data.contactId, organizationId: ctx.orgId },
      })
      if (!contact) throw new Error('Contato não encontrado.')
      contactRole = contact.role || undefined
    }

    // TRANSACTION WRAPPER
    await db.$transaction(async (tx) => {
      // 1. Transferir contatos se necessário
      if (data.assignedTo && deal.assignedTo !== data.assignedTo) {
        const dealContacts = await tx.dealContact.findMany({
          where: { dealId: data.id },
          select: { contactId: true },
        })

        if (dealContacts.length > 0) {
          await tx.contact.updateMany({
            where: {
              id: { in: dealContacts.map((dc) => dc.contactId) },
              organizationId: ctx.orgId,
            },
            data: { assignedTo: data.assignedTo },
          })
        }
      }

      // 2. Atualizar vínculo de contato principal
      if (typeof data.contactId !== 'undefined') {
        await tx.dealContact.updateMany({
          where: { dealId: data.id, isPrimary: true },
          data: { isPrimary: false },
        })

        if (data.contactId) {
          await tx.dealContact.upsert({
            where: {
              dealId_contactId: { dealId: data.id, contactId: data.contactId },
            },
            create: {
              dealId: data.id,
              contactId: data.contactId,
              isPrimary: true,
              role: contactRole,
            },
            update: { isPrimary: true },
          })
        }
      }

      // 3. Update Deal
      await tx.deal.update({
        where: { id: data.id },
        data: updateData,
      })

      // 4. Logs de Atividade
      if (data.assignedTo && data.assignedTo !== deal.assignedTo) {
        await tx.activity.create({
          data: {
            dealId: data.id,
            type: 'assignee_changed',
            content: `Responsável alterado para ${newAssigneeName}`,
            performedBy: ctx.userId,
          },
        })
      }

      if (data.priority && data.priority !== deal.priority) {
        await tx.activity.create({
          data: {
            dealId: data.id,
            type: 'priority_changed',
            content: `Prioridade alterada para ${data.priority}`,
            performedBy: ctx.userId,
          },
        })
      }

      if (
        data.expectedCloseDate &&
        data.expectedCloseDate.getTime() !== deal.expectedCloseDate?.getTime()
      ) {
        const newDate = new Intl.DateTimeFormat('pt-BR').format(
          data.expectedCloseDate,
        )
        const oldDate = deal.expectedCloseDate
          ? new Intl.DateTimeFormat('pt-BR').format(deal.expectedCloseDate)
          : 'Sem data'
        await tx.activity.create({
          data: {
            dealId: data.id,
            type: 'date_changed',
            content: `Alterou previsão de ${oldDate} para ${newDate}`,
            performedBy: ctx.userId,
          },
        })
      }
    })

    revalidatePath('/crm/pipeline')
    revalidatePath('/contacts')
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`deal:${data.id}`)

    return { success: true }
  })
