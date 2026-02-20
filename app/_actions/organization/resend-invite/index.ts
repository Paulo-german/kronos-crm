'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { resendInviteSchema } from './schema'
import { db } from '@/_lib/prisma'
import { randomUUID } from 'crypto'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

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

    // "Enviar" E-mail (Simulação)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL não está configurado.')

    const magicLink = `${appUrl}/invite/${newToken}`

    console.log('-------------------------------------------------------')
    console.log('📧 SIMULAÇÃO DE REENVIO DE E-MAIL (CONVITE)')
    console.log(`PARA: ${member.email}`)
    console.log(`DE: Kronos CRM <nao-responda@kronos.com.br>`)
    console.log(`ASSUNTO: Lembrete: Você foi convidado para ${member.organization.name}`)
    console.log('---')
    console.log('Olá,')
    console.log('Este é um lembrete do seu convite para participar da organização.')
    console.log('Clique no link abaixo para aceitar:')
    console.log(magicLink)
    console.log('-------------------------------------------------------')

    return { success: true }
  })
