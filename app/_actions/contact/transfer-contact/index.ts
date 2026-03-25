'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { transferContactSchema } from './schema'
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

interface TransferContactResult {
  success: true
  cascadedDealIds: string[]
}

export const transferContact = orgActionClient
  .schema(transferContactSchema)
  .action(
    async ({ parsedInput: data, ctx }): Promise<TransferContactResult> => {
      // 1. RBAC: permissão de transferência (ADMIN+ apenas)
      requirePermission(canPerformAction(ctx, 'contact', 'transfer'))

      // 2. Buscar contato existente na org
      const contact = await db.contact.findFirst({
        where: {
          id: data.contactId,
          organizationId: ctx.orgId,
        },
        select: {
          id: true,
          name: true,
          assignedTo: true,
        },
      })

      if (!contact) {
        throw new Error('Contato não encontrado.')
      }

      // 3. Ownership: verificar acesso ao registro e permissão de transferência
      requirePermission(canAccessRecord(ctx, { assignedTo: contact.assignedTo }))
      requirePermission(canTransferOwnership(ctx))

      // Noop guard: se o novo responsável já é o atual, retornar sem erro
      if (data.newAssigneeId === contact.assignedTo) {
        return { success: true, cascadedDealIds: [] }
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

      // 5. Transação: cascade de deals + atualizar contato + activity logs
      const cascadedDealIds: string[] = []

      await db.$transaction(async (tx) => {
        // 5a. Se cascadeDeals: transferir todos os deals vinculados ao contato
        if (data.cascadeDeals) {
          const dealContacts = await tx.dealContact.findMany({
            where: { contactId: data.contactId },
            select: { dealId: true },
          })

          if (dealContacts.length > 0) {
            // Extrair dealIds únicos
            const dealIds = [...new Set(dealContacts.map((dc) => dc.dealId))]

            await tx.deal.updateMany({
              where: {
                id: { in: dealIds },
                organizationId: ctx.orgId,
              },
              data: { assignedTo: data.newAssigneeId },
            })

            // Criar activity log para cada deal afetado
            const activitiesToCreate = dealIds.map((dealId) => ({
              dealId,
              type: 'assignee_changed' as const,
              content: `Responsável transferido para ${newAssigneeName}`,
              performedBy: ctx.userId,
            }))

            await tx.activity.createMany({
              data: activitiesToCreate,
            })

            cascadedDealIds.push(...dealIds)
          }
        }

        // 5b. Atualizar contato com novo responsável
        await tx.contact.update({
          where: { id: data.contactId },
          data: { assignedTo: data.newAssigneeId },
        })
      })

      // 6. Invalidar cache de todas as tags afetadas
      revalidateTag(`contacts:${ctx.orgId}`)
      revalidateTag(`contact:${data.contactId}`)
      revalidatePath('/contacts')

      if (cascadedDealIds.length > 0) {
        revalidateTag(`deals:${ctx.orgId}`)
        revalidateTag(`pipeline:${ctx.orgId}`)
        revalidateTag(`dashboard:${ctx.orgId}`)
        for (const dealId of cascadedDealIds) {
          revalidateTag(`deal:${dealId}`)
        }
        revalidatePath('/crm/deals/pipeline')
        revalidatePath('/crm/deals/list')
      }

      // 7. Notificação fire-and-forget para o novo responsável (somente se for diferente do executor)
      if (data.newAssigneeId !== ctx.userId) {
        const cascadeCount = cascadedDealIds.length
        const notificationBody =
          cascadeCount > 0
            ? `O contato "${contact.name}" foi transferido para você (incluindo ${cascadeCount} negócio(s) vinculado(s)).`
            : `O contato "${contact.name}" foi transferido para você.`

        void getOrgSlug(ctx.orgId).then((slug) => {
          void createNotification({
            orgId: ctx.orgId,
            userId: data.newAssigneeId,
            type: 'USER_ACTION',
            title: 'Contato transferido para você',
            body: notificationBody,
            actionUrl: `/org/${slug}/contacts/${data.contactId}`,
            resourceType: 'contact',
            resourceId: data.contactId,
          })
        })
      }

      return { success: true, cascadedDealIds }
    },
  )
