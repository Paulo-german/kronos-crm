'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { sendTestMessageSchema } from './schema'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { sendWhatsAppMessage } from '@/_lib/evolution/send-message'
import { resolveEvolutionCredentials } from '@/_lib/evolution/resolve-credentials'

export const sendTestMessage = orgActionClient
  .schema(sendTestMessageSchema)
  .action(async ({ parsedInput: { phoneNumber }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // Busca inbox WhatsApp conectada
    const inbox = await db.inbox.findFirst({
      where: {
        organizationId: ctx.orgId,
        channel: 'WHATSAPP',
        evolutionInstanceName: { not: null },
      },
      select: {
        id: true,
        evolutionInstanceName: true,
      },
    })

    if (!inbox?.evolutionInstanceName) {
      throw new Error('Nenhuma caixa de entrada WhatsApp conectada.')
    }

    // Formata remoteJid: remove tudo que não é dígito, adiciona 55 se necessário
    const digits = phoneNumber.replace(/\D/g, '')
    const normalized = digits.startsWith('55') ? digits : `55${digits}`
    const remoteJid = `${normalized}@s.whatsapp.net`

    const org = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { name: true },
    })

    const credentials = await resolveEvolutionCredentials(inbox.id)
    const instanceName = inbox.evolutionInstanceName

    await sendWhatsAppMessage(
      instanceName,
      remoteJid,
      `Olá! Esta é uma mensagem de teste do *${org.name}* via Kronos Hub. Se você recebeu esta mensagem, sua conexão WhatsApp está funcionando corretamente!`,
      credentials,
    )

    return { success: true }
  })
