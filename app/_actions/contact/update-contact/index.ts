'use server'

import { Prisma } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { updateContactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  canPerformAction,
  canAccessRecord,
  canTransferOwnership,
  requirePermission,
  isOwnershipChange,
  isElevated,
} from '@/_lib/rbac'
import { normalizeEmail } from '@/_lib/contact/normalize-email'
import { toE164 } from '@/_utils/to-e164'

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
      canAccessRecord(ctx, { assignedTo: existingContact.assignedTo }),
    )

    // 4. Bloquear edição de campos PII para MEMBER quando o toggle de proteção está ativo
    if (!isElevated(ctx.userRole) && ctx.hidePiiFromMembers) {
      const hasPiiUpdate = data.email !== undefined || data.phone !== undefined
      if (hasPiiUpdate) {
        throw new Error(
          'Apenas administradores podem editar informações de contato sensíveis.',
        )
      }
    }

    // 5. Se está mudando assignedTo, verificar permissão de transferência
    if (isOwnershipChange(data.assignedTo, existingContact.assignedTo)) {
      requirePermission(canTransferOwnership(ctx))
    }

    // 6. Se mudou a empresa, verifica se a nova pertence à organização
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

    try {
      await db.contact.update({
        where: { id: data.id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && {
            email: normalizeEmail(data.email),
          }),
          ...(data.phone !== undefined && { phone: toE164(data.phone) }),
          ...(data.role !== undefined && { role: data.role || null }),
          ...(data.companyId !== undefined && { companyId: data.companyId }),
          ...(data.isDecisionMaker !== undefined && {
            isDecisionMaker: data.isDecisionMaker,
          }),
          ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new Error(
          'Já existe um contato com este email nesta organização.',
        )
      }
      throw error
    }

    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`contact:${data.id}`)

    return { success: true }
  })
