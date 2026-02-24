'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { resendInviteSchema } from './schema'
import { db } from '@/_lib/prisma'
import { randomUUID } from 'crypto'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { sendInviteEmail } from '@/_lib/email/send-invite-email'

export const resendInvite = orgActionClient
  .schema(resendInviteSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 0. Verificar permissão (apenas ADMIN/OWNER podem reenviar convites)
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // Buscar o convite pendente
    const member = await db.member.findUnique({
      where: {
        id: data.memberId,
        organizationId: ctx.orgId,
        status: 'PENDING',
      },
      include: {
        organization: {
          select: { name: true },
        },
      },
    })

    if (!member) {
      throw new Error('Convite não encontrado ou já foi aceito.')
    }

    // Gerar novo token
    const newToken = randomUUID()

    await db.member.update({
      where: { id: member.id },
      data: { invitationToken: newToken },
    })

    // Enviar e-mail de lembrete
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL não está configurado.')

    await sendInviteEmail({
      to: member.email,
      orgName: member.organization.name,
      inviteLink: `${appUrl}/invite/${newToken}`,
      isReminder: true,
    })

    revalidateTag(`org-members:${ctx.orgId}`)

    return { success: true }
  })
