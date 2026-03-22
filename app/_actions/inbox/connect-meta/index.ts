'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { exchangeMetaCodeForToken } from '@/_lib/meta/exchange-meta-token'
import { subscribeMetaApp } from '@/_lib/meta/subscribe-meta-app'
import { getMetaPhoneDisplay } from '@/_lib/meta/get-meta-phone-display'
import { connectMetaSchema } from './schema'

export const connectMeta = orgActionClient
  .schema(connectMetaSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: somente OWNER e ADMIN podem configurar conexoes
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Validar inbox pertence a org
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        evolutionInstanceName: true,
        metaPhoneNumberId: true,
        zapiInstanceId: true,
        connectionType: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Validar que o inbox nao tem conexao ativa
    if (inbox.connectionType === 'META_CLOUD' && inbox.metaPhoneNumberId) {
      throw new Error('Esta caixa de entrada já possui uma conexão Meta WhatsApp ativa.')
    }

    if (inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada já possui uma conexão WhatsApp via QR Code. Desconecte primeiro.')
    }

    if (inbox.connectionType === 'Z_API' && inbox.zapiInstanceId) {
      throw new Error('Esta caixa de entrada já possui uma conexão Z-API ativa. Desconecte primeiro.')
    }

    // 3b. Validar que o phoneNumberId nao esta associado a outro inbox da org
    const conflictingInbox = await db.inbox.findFirst({
      where: {
        metaPhoneNumberId: data.phoneNumberId,
        id: { not: data.inboxId },
      },
    })

    if (conflictingInbox) {
      throw new Error('Este número de telefone já está conectado a outra caixa de entrada.')
    }

    // 4. Trocar code por access_token server-side (META_APP_SECRET nunca sai do servidor)
    const accessToken = await exchangeMetaCodeForToken(data.code)

    // 5. Inscrever app na WABA para receber webhooks
    await subscribeMetaApp(data.wabaId, accessToken)

    // 6. Buscar numero formatado para exibicao
    const phoneDisplay = await getMetaPhoneDisplay(data.phoneNumberId, accessToken)

    // 7. Atualizar inbox com dados Meta
    await db.inbox.update({
      where: { id: inbox.id },
      data: {
        connectionType: 'META_CLOUD',
        metaWabaId: data.wabaId,
        metaPhoneNumberId: data.phoneNumberId,
        metaAccessToken: accessToken,
        metaPhoneDisplay: phoneDisplay,
      },
    })

    // 8. Invalidar cache
    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return {
      success: true,
      inboxId: inbox.id,
      phoneDisplay,
    }
  })
