'use server'

import { after } from 'next/server'
import { orgActionClient } from '@/_lib/safe-action'
import { transferDealSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  canPerformAction,
  canAccessRecord,
  canTransferOwnership,
  requirePermission,
} from '@/_lib/rbac'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'

interface TransferDealResult {
  success: true
  cascadedContactIds: string[]
}

export const transferDeal = orgActionClient
  .schema(transferDealSchema)
  .action(async ({ parsedInput: data, ctx }): Promise<TransferDealResult> => {
    // 1. RBAC: permissão de transferência (ADMIN+ apenas)
    requirePermission(canPerformAction(ctx, 'deal', 'transfer'))

    // 2. Buscar deal existente na org
    const deal = await db.deal.findFirst({
      where: {
        id: data.dealId,
        organizationId: ctx.orgId,
      },
      select: {
        id: true,
        title: true,
        assignedTo: true,
      },
    })

    if (!deal) {
      throw new Error('Negócio não encontrado.')
    }

    // 3. Ownership: verificar acesso ao registro e permissão de transferência
    requirePermission(canAccessRecord(ctx, { assignedTo: deal.assignedTo }))
    requirePermission(canTransferOwnership(ctx))

    // Noop guard: se o novo responsável já é o atual, retornar sem erro
    if (data.newAssigneeId === deal.assignedTo) {
      return { success: true, cascadedContactIds: [] }
    }

    // 4. Validar que o novo responsável é membro ACCEPTED da org
    const targetMember = await db.member.findFirst({
      where: {
        organizationId: ctx.orgId,
        userId: data.newAssigneeId,
        status: 'ACCEPTED',
      },
      include: {
        user: { select: { fullName: true, email: true } },
      },
    })

    if (!targetMember) {
      throw new Error('O membro selecionado não pertence a esta organização.')
    }

    const newAssigneeName =
      targetMember.user?.fullName || targetMember.user?.email || 'Usuário'

    // 5. Transação: cascade de contatos + atualizar deal + activity log
    const cascadedContactIds: string[] = []

    await db.$transaction(async (tx) => {
      // 5a. Se cascadeContacts: transferir todos os contatos vinculados ao deal
      if (data.cascadeContacts) {
        const dealContacts = await tx.dealContact.findMany({
          where: { dealId: data.dealId },
          select: { contactId: true },
        })

        if (dealContacts.length > 0) {
          const contactIds = dealContacts.map((dc) => dc.contactId)

          await tx.contact.updateMany({
            where: {
              id: { in: contactIds },
              organizationId: ctx.orgId,
            },
            data: { assignedTo: data.newAssigneeId },
          })

          cascadedContactIds.push(...contactIds)
        }
      }

      // 5b. Atualizar deal com novo responsável
      await tx.deal.update({
        where: { id: data.dealId },
        data: { assignedTo: data.newAssigneeId },
      })

      // 5c. Criar activity log de transferência
      await tx.activity.create({
        data: {
          dealId: data.dealId,
          type: 'assignee_changed',
          content: `Responsável transferido para ${newAssigneeName}`,
          performedBy: ctx.userId,
        },
      })
    })

    // 6. Invalidar cache de todas as tags afetadas
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)
    revalidatePath('/crm/deals/pipeline')
    revalidatePath('/crm/deals/list')

    if (cascadedContactIds.length > 0) {
      revalidateTag(`contacts:${ctx.orgId}`)
      for (const contactId of cascadedContactIds) {
        revalidateTag(`contact:${contactId}`)
      }
      revalidatePath('/contacts')
    }

    // 7. Notificar novo responsável (somente se for diferente do executor)
    if (data.newAssigneeId !== ctx.userId) {
      const cascadeCount = cascadedContactIds.length
      const notificationBody =
        cascadeCount > 0
          ? `O deal "${deal.title}" foi transferido para você (incluindo ${cascadeCount} contato(s) vinculado(s)).`
          : `O deal "${deal.title}" foi transferido para você.`

      after(async () => {
        const slug = await getOrgSlug(ctx.orgId)
        await createNotification({
          orgId: ctx.orgId,
          userId: data.newAssigneeId,
          type: 'USER_ACTION',
          title: 'Deal transferido para você',
          body: notificationBody,
          actionUrl: `/org/${slug}/crm/deals/${data.dealId}`,
          resourceType: 'deal',
          resourceId: data.dealId,
        })
      })
    }

    return { success: true, cascadedContactIds }
  })
