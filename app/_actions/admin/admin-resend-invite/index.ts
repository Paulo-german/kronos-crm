'use server'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { randomUUID } from 'crypto'
import { adminResendInviteSchema } from './schema'
import { sendInviteEmail } from '@/_lib/email/send-invite-email'

export const adminResendInvite = superAdminActionClient
  .schema(adminResendInviteSchema)
  .action(async ({ parsedInput: { organizationId, memberId } }) => {
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId, status: 'PENDING' },
      include: { organization: { select: { name: true } } },
    })

    if (!member) throw new Error('Convite não encontrado ou já foi aceito.')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL não está configurado.')

    const newToken = randomUUID()
    await db.member.update({ where: { id: member.id }, data: { invitationToken: newToken } })

    await sendInviteEmail({
      to: member.email,
      orgName: member.organization.name,
      inviteLink: `${appUrl}/invite/${newToken}`,
      isReminder: true,
    })

    revalidateTag(`org-members:${organizationId}`)

    return { success: true }
  })
