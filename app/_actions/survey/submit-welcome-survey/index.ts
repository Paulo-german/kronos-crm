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

    // 2. Idempotência: se já respondeu para esta org, retorna sucesso sem duplicar
    const existing = await db.userProfile.findUnique({
      where: { userId_organizationId: { userId: ctx.userId, organizationId: ctx.orgId } },
      select: { profileCompletedAt: true },
    })

    if (existing?.profileCompletedAt) {
      return { success: true, alreadyCompleted: true }
    }

    // 3. Upsert por par userId+orgId — permite um perfil por organização
    await db.userProfile.upsert({
      where: { userId_organizationId: { userId: ctx.userId, organizationId: ctx.orgId } },
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

    // 4. Invalida o cache do status para este par userId+orgId
    revalidateTag(`user-profile:${ctx.userId}:${ctx.orgId}`)

    return { success: true, alreadyCompleted: false }
  })
