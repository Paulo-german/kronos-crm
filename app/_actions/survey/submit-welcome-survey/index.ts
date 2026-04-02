'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { submitWelcomeSurveySchema } from './schema'

export const submitWelcomeSurvey = orgActionClient
  .schema(submitWelcomeSurveySchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: apenas o OWNER da organização pode responder o survey
    if (ctx.userRole !== 'OWNER') {
      throw new Error('Apenas o proprietário da organização pode responder o survey.')
    }

    // 2. Idempotência: se já respondeu, retorna sucesso sem criar duplicata
    // (protege contra race conditions e double-submit)
    const existing = await db.userProfile.findUnique({
      where: { userId: ctx.userId },
      select: { profileCompletedAt: true },
    })

    if (existing?.profileCompletedAt) {
      return { success: true, alreadyCompleted: true }
    }

    // 3. Upsert — cria o perfil se não existe, ou completa um perfil parcial
    // userId e organizationId vêm exclusivamente do ctx (nunca do client)
    await db.userProfile.upsert({
      where: { userId: ctx.userId },
      create: {
        userId: ctx.userId,
        organizationId: ctx.orgId,
        role: data.role,
        teamSize: data.teamSize,
        crmExperience: data.crmExperience,
        mainChallenge: data.mainChallenge,
        referralSource: data.referralSource,
        profileCompletedAt: new Date(),
      },
      update: {
        role: data.role,
        teamSize: data.teamSize,
        crmExperience: data.crmExperience,
        mainChallenge: data.mainChallenge,
        referralSource: data.referralSource,
        profileCompletedAt: new Date(),
      },
    })

    // 4. Invalida o cache do status — faz o layout re-renderizar sem o modal
    revalidateTag(`user-profile:${ctx.userId}`)

    return { success: true, alreadyCompleted: false }
  })
