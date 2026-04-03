'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { completeTutorialSchema } from './schema'

/**
 * Registra a conclusão de um tutorial pelo usuário.
 * Idempotente: verifica existência antes de criar — não duplica se chamado 2x.
 * Sem RBAC de permissão: qualquer membro pode completar um tutorial para si próprio.
 * O userId vem sempre de ctx.userId (middleware) — nunca do cliente.
 */
export const completeTutorial = orgActionClient
  .schema(completeTutorialSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const existing = await db.tutorialCompletion.findUnique({
      where: {
        userId_organizationId_tutorialId: {
          userId: ctx.userId,
          organizationId: ctx.orgId,
          tutorialId: data.tutorialId,
        },
      },
      select: { id: true },
    })

    if (existing) {
      return { success: true, alreadyCompleted: true }
    }

    await db.tutorialCompletion.create({
      data: {
        userId: ctx.userId,
        organizationId: ctx.orgId,
        tutorialId: data.tutorialId,
      },
    })

    revalidateTag(`tutorials:${ctx.userId}:${ctx.orgId}`)

    return { success: true, alreadyCompleted: false }
  })
