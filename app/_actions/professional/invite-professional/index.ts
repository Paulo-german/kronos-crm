'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { inviteProfessionalSchema } from './schema'
import { db } from '@/_lib/prisma'
import { randomUUID } from 'crypto'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resend } from '@/_lib/resend'

const INVITE_EXPIRATION_HOURS = 72

export const inviteProfessional = orgActionClient
  .schema(inviteProfessionalSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Apenas OWNER/ADMIN/SUPPORT podem convidar profissionais
    requirePermission(canPerformAction(ctx, 'professional', 'update'))

    // 2. Verificar que o profissional pertence à org e ainda não tem acesso
    const professional = await db.professional.findFirst({
      where: { id: data.professionalId, organizationId: ctx.orgId },
      select: { id: true, userId: true, name: true },
    })

    if (!professional) {
      throw new Error('Profissional não encontrado.')
    }

    // Convite só faz sentido para profissionais sem login vinculado
    if (professional.userId !== null) {
      throw new Error('Profissional já possui acesso.')
    }

    // 3. Gerar token e expiração (72h)
    const inviteToken = randomUUID()
    const inviteExpiresAt = new Date(
      Date.now() + INVITE_EXPIRATION_HOURS * 60 * 60 * 1000,
    )

    // 4. Persistir token no profissional
    await db.professional.update({
      where: { id: professional.id },
      data: { inviteToken, inviteExpiresAt },
    })

    // 5. Buscar nome da org para o e-mail
    const organization = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { name: true },
    })

    // 6. Enviar e-mail de convite
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL não está configurado.')

    const inviteLink = `${appUrl}/invite/professional/${inviteToken}`

    const { error } = await resend.emails.send({
      from: 'Kronos Hub <no-reply@kronoshub.com.br>',
      to: data.email,
      subject: `Você foi convidado para acessar a agenda de ${organization.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
          <h2 style="color: #111; margin-bottom: 16px;">Convite para profissional</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">
            Olá, ${professional.name}! Você foi convidado para acessar a agenda da organização
            <strong>${organization.name}</strong> no Kronos Hub.
          </p>
          <p style="margin: 24px 0;">
            <a
              href="${inviteLink}"
              style="display: inline-block; background-color: #8257e5; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;"
            >
              Aceitar convite
            </a>
          </p>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            Este link expira em ${INVITE_EXPIRATION_HOURS} horas. Se você não esperava este convite, pode ignorar este e-mail.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Kronos Hub</p>
        </div>
      `,
    })

    if (error) {
      throw new Error(`Falha ao enviar e-mail de convite: ${error.message}`)
    }

    // 7. Invalidar cache do profissional
    revalidateTag(`professional:${professional.id}`)

    return { success: true }
  })
