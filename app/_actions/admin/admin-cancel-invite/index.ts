'use server'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { adminCancelInviteSchema } from './schema'

export const adminCancelInvite = superAdminActionClient
  .schema(adminCancelInviteSchema)
  .action(async ({ parsedInput: { organizationId, memberId } }) => {
    const invite = await db.member.findFirst({
      where: { id: memberId, organizationId, status: 'PENDING' },
    })

    if (!invite) throw new Error('Convite não encontrado ou já foi aceito.')

    await db.member.delete({ where: { id: memberId } })
    revalidateTag(`org-members:${organizationId}`)

    return { success: true }
  })
