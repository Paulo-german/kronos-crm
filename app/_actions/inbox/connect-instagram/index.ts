'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { exchangeMetaCodeForToken } from '@/_lib/meta/exchange-meta-token'
import { subscribeInstagramApp } from '@/_lib/instagram/subscribe-instagram-app'
import { getInstagramUsername } from '@/_lib/instagram/get-instagram-account'
import { connectInstagramSchema } from './schema'

export const connectInstagram = orgActionClient
  .schema(connectInstagramSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: somente OWNER e ADMIN podem configurar conexoes
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Buscar inbox e validar pertence a org
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        channel: true,
        connectionType: true,
        metaIgUserId: true,
        evolutionInstanceName: true,
        metaPhoneNumberId: true,
        zapiInstanceId: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Validar que o inbox e do canal Instagram (nao WhatsApp)
    if (inbox.channel !== 'INSTAGRAM_DM') {
      throw new Error('Esta caixa de entrada não é do tipo Instagram Direct. Verifique o canal configurado.')
    }

    // 4. Bloquear se ja tiver qualquer conexao ativa
    if (inbox.connectionType === 'META_CLOUD' && inbox.metaIgUserId) {
      throw new Error('Esta caixa de entrada já possui uma conexão Instagram ativa.')
    }

    if (inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada já possui uma conexão WhatsApp via QR Code. Desconecte primeiro.')
    }

    if (inbox.connectionType === 'META_CLOUD' && inbox.metaPhoneNumberId) {
      throw new Error('Esta caixa de entrada já possui uma conexão Meta WhatsApp ativa. Desconecte primeiro.')
    }

    if (inbox.zapiInstanceId) {
      throw new Error('Esta caixa de entrada já possui uma conexão Z-API ativa. Desconecte primeiro.')
    }

    // 5. Validar que o igUserId nao esta associado a outro inbox da org
    const conflictingInbox = await db.inbox.findFirst({
      where: {
        metaIgUserId: data.igUserId,
        id: { not: data.inboxId },
      },
    })

    if (conflictingInbox) {
      throw new Error('Esta conta Instagram já está conectada a outra caixa de entrada.')
    }

    // 6. Trocar code por access_token server-side (META_APP_SECRET nunca sai do servidor)
    const accessToken = await exchangeMetaCodeForToken(data.code)

    // 7. Inscrever app no endpoint de mensagens do IG Business User para receber webhooks
    await subscribeInstagramApp(data.igUserId, accessToken)

    // 8. Buscar username (@handle) para exibicao
    const igUsername = await getInstagramUsername(data.igUserId, accessToken)

    // 9. Atualizar inbox com dados Instagram
    await db.inbox.update({
      where: { id: inbox.id },
      data: {
        connectionType: 'META_CLOUD',
        channel: 'INSTAGRAM_DM',
        metaIgUserId: data.igUserId,
        metaIgPageId: data.pageId,
        metaAccessToken: accessToken,
        metaIgUsername: igUsername,
      },
    })

    // 10. Invalidar cache
    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { igUsername }
  })
