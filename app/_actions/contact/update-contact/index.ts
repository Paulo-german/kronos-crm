'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateContactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  canPerformAction,
  canAccessRecord,
  canTransferOwnership,
  requirePermission,
  isOwnershipChange,
} from '@/_lib/rbac'

export const updateContact = orgActionClient
  .schema(updateContactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base para editar contatos
    requirePermission(canPerformAction(ctx, 'contact', 'update'))

    // 2. Buscar contato existente
    const existingContact = await db.contact.findFirst({
      where: {
        id: data.id,
        organizationId: ctx.orgId,
      },
    })

    if (!existingContact) {
      throw new Error('Contato não encontrado.')
    }

    // 3. Verificar acesso ao registro (MEMBER só edita próprios)
    requirePermission(
      canAccessRecord(ctx, { assignedTo: existingContact.assignedTo })
    )

    // 4. Se está mudando assignedTo, verificar permissão de transferência
    if (isOwnershipChange(data.assignedTo, existingContact.assignedTo)) {
      requirePermission(canTransferOwnership(ctx))
    }

    // 5. Se mudou a empresa, verifica se a nova pertence à organização
    if (data.companyId && data.companyId !== existingContact.companyId) {
      const company = await db.company.findFirst({
        where: {
          id: data.companyId,
          organizationId: ctx.orgId,
        },
      })

      if (!company) {
        throw new Error('Empresa não encontrada ou não pertence à organização.')
      }
    }

    await db.contact.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.role !== undefined && { role: data.role || null }),
        ...(data.cpf !== undefined && { cpf: data.cpf || null }),
        ...(data.companyId !== undefined && { companyId: data.companyId }),
        ...(data.isDecisionMaker !== undefined && {
          isDecisionMaker: data.isDecisionMaker,
        }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
      },
    })

    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`contact:${data.id}`)
    revalidatePath('/contacts')

    return { success: true }
  })
