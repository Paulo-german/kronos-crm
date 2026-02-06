'use server'

import { authActionClient } from '@/_lib/safe-action'
import { updateProfileSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'

export const updateProfile = authActionClient
  .schema(updateProfileSchema)
  .action(async ({ parsedInput: { fullName, avatarUrl }, ctx }) => {
    await db.user.update({
      where: { id: ctx.userId },
      data: {
        fullName,
        avatarUrl: avatarUrl ?? null,
      },
    })

    revalidateTag(`user:${ctx.userId}`)

    return { success: true }
  })
