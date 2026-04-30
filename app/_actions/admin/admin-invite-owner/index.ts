'use server'

import { randomUUID } from 'crypto'
import { revalidateTag } from 'next/cache'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { sendInviteEmail } from '@/_lib/email/send-invite-email'
import { scheduleNotification } from '@/_lib/notifications/create-notification'
import { adminInviteOwnerSchema } from './schema'

export const adminInviteOwner = superAdminActionClient
  .schema(adminInviteOwnerSchema)
  .action(async ({ parsedInput: { organizationId, email } }) => {
    const organization = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true },
    })

    const existingMember = await db.member.findUnique({
      where: { organizationId_email: { organizationId, email } },
    })

    if (existingMember) {
      if (existingMember.status === 'ACCEPTED') {
        throw new Error('Este e-mail já é membro desta organização.')
      }
      throw new Error('Já existe um convite pendente para este e-mail. Cancele antes de reenviar.')
    }

    const invitationToken = randomUUID()

    const newMember = await db.member.create({
      data: {
        organizationId,
        email,
        role: 'OWNER',
        status: 'PENDING',
        invitationToken,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL não está configurado.')

    await sendInviteEmail({
      to: email,
      orgName: organization.name,
      inviteLink: `${appUrl}/invite/${invitationToken}`,
    })

    revalidateTag(`org-members:${organizationId}`)

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      scheduleNotification({
        orgId: organizationId,
        userId: existingUser.id,
        type: 'USER_ACTION',
        title: 'Convite para organização',
        body: `Você foi convidado para participar de ${organization.name} como OWNER.`,
        actionUrl: `/invite/${invitationToken}`,
        resourceType: 'member',
        resourceId: newMember.id,
      })
    }

    return { success: true }
  })
