'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createActivitySchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'
import { findDealWithRBAC, canPerformAction, requirePermission } from '@/_lib/rbac'

export const createActivity = orgActionClient
  .schema(createActivitySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'deal', 'update'))

    // 2. Buscar deal com verificação RBAC
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Cria a atividade
    await db.activity.create({
      data: {
        type: data.type,
        content: data.content,
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)

    return { success: true }
  })
