'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { inviteMemberSchema } from './schema'
import { db } from '@/_lib/prisma'
import { randomUUID } from 'crypto'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission, requireQuota } from '@/_lib/rbac'
import { sendInviteEmail } from '@/_lib/email/send-invite-email'

export const inviteMember = orgActionClient
  .schema(inviteMemberSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 0. Verificar permissão (apenas ADMIN/OWNER podem convidar membros)
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // 1. Quota Check (CRÍTICO)
    await requireQuota(ctx.orgId, 'member')

    // 1.1 Validar Role (CRÍTICO) - Ninguém pode ser convidado diretamente como OWNER
    if (data.role === 'OWNER') {
      throw new Error(
        'Não é possível convidar um membro como OWNER. Convide como MEMBER ou ADMIN e transfira a propriedade posteriormente.',
      )
    }

    // 2. Verificar se já existe membro com este email na organização
    const existingMember = await db.member.findUnique({
      where: {
        organizationId_email: {
          organizationId: ctx.orgId,
          email: data.email,
        },
      },
    })

    if (existingMember) {
      if (existingMember.status === 'ACCEPTED') {
        throw new Error('Este e-mail já é membro desta organização.')
      } else {
        throw new Error(
          'Já existe um convite pendente para este e-mail. Cancele o anterior se quiser reenviar.',
        )
      }
    }

    // 3. Gerar token de convite
    const invitationToken = randomUUID()

    // 4. Criar registro do membro (PENDING)
    await db.member.create({
      data: {
        organizationId: ctx.orgId,
        email: data.email,
        role: data.role,
        status: 'PENDING',
        invitationToken,
      },
    })

    // 5. Enviar e-mail de convite
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL não está configurado.')

    const organization = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { name: true },
    })

    await sendInviteEmail({
      to: data.email,
      orgName: organization.name,
      inviteLink: `${appUrl}/invite/${invitationToken}`,
    })

    revalidateTag(`org-members:${ctx.orgId}`)

    return { success: true }
  })
