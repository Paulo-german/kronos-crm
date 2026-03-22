'use server'

import { revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { deletePlanSchema } from './schema'

export const deletePlan = superAdminActionClient
  .schema(deletePlanSchema)
  .action(async ({ parsedInput: { planId } }) => {
    const plan = await db.plan.findUnique({
      where: { id: planId },
      select: {
        name: true,
        _count: {
          select: {
            subscriptions: { where: { status: { in: ['active', 'trialing'] } } },
            grantedOrganizations: true,
          },
        },
      },
    })

    if (!plan) {
      throw new Error('Plano não encontrado.')
    }

    if (plan._count.subscriptions > 0) {
      throw new Error(
        `Não é possível excluir "${plan.name}": possui ${plan._count.subscriptions} assinatura(s) ativa(s).`,
      )
    }

    if (plan._count.grantedOrganizations > 0) {
      throw new Error(
        `Não é possível excluir "${plan.name}": possui ${plan._count.grantedOrganizations} organização(ões) com override.`,
      )
    }

    await db.plan.delete({ where: { id: planId } })

    revalidateTag('plan-limits')

    return { success: true }
  })
