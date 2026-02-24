import { resend } from '@/_lib/resend'

interface SendInviteEmailParams {
  to: string
  orgName: string
  inviteLink: string
  isReminder?: boolean
}

export async function sendInviteEmail({
  to,
  orgName,
  inviteLink,
  isReminder = false,
}: SendInviteEmailParams) {
  const subject = isReminder
    ? `Lembrete: Você foi convidado para ${orgName}`
    : `Você foi convidado para ${orgName}`

  const { error } = await resend.emails.send({
    from: 'Kronos CRM <no-reply@kronoshub.com.br>',
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #111; margin-bottom: 16px;">
          ${isReminder ? 'Lembrete de convite' : 'Você foi convidado!'}
        </h2>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">
          ${isReminder ? 'Este é um lembrete: você' : 'Você'} foi convidado para participar da organização
          <strong>${orgName}</strong> no Kronos CRM.
        </p>
        <p style="margin: 24px 0;">
          <a
            href="${inviteLink}"
            style="display: inline-block; background-color: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;"
          >
            Aceitar convite
          </a>
        </p>
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          Se você não esperava este convite, pode ignorar este e-mail com segurança.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Kronos CRM</p>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Falha ao enviar e-mail de convite: ${error.message}`)
  }
}
