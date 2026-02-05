'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { contactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  canPerformAction,
  requirePermission,
  resolveAssignedTo,
  requireQuota,
} from '@/_lib/rbac'

export const createContact = orgActionClient
  .schema(contactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base para criar contatos
    requirePermission(canPerformAction(ctx, 'contact', 'create'))

    // 2. Verificar quota do plano
    await requireQuota(ctx.orgId, 'contact')

    // 3. Resolver assignedTo (MEMBER = forçado para si mesmo)
    const assignedTo = resolveAssignedTo(ctx, data.assignedTo)

    // 4. Se tem empresa, verifica se pertence à organização
    if (data.companyId) {
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

    const contact = await db.contact.create({
      data: {
        organizationId: ctx.orgId,
        assignedTo,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        role: data.role || null,
        cpf: data.cpf || null,
        companyId: data.companyId || null,
        isDecisionMaker: data.isDecisionMaker,
      },
    })

    revalidateTag(`contacts:${ctx.orgId}`)
    revalidatePath('/contacts')

    return { success: true, contactId: contact.id }
  })
