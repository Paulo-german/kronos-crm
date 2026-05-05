'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { fetchWabaPhoneNumbers } from '@/_lib/meta/fetch-waba-phone-numbers'
import { updateMetaPhoneNumberSchema } from './schema'

export const updateMetaPhoneNumber = orgActionClient
  .schema(updateMetaPhoneNumberSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    const inbox = await db.inbox.findFirst({
      where: { id: parsedInput.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        connectionType: true,
        metaWabaId: true,
        metaAccessToken: true,
        metaPhoneNumberId: true,
      },
    })

    if (!inbox) throw new Error('Caixa de entrada não encontrada.')
    if (inbox.connectionType !== 'META_CLOUD' || !inbox.metaWabaId || !inbox.metaAccessToken) {
      throw new Error('Esta caixa de entrada não está conectada à Meta Cloud API.')
    }

    // Early return: numero identico ao atual nao gera mutacao desnecessaria
    if (inbox.metaPhoneNumberId === parsedInput.phoneNumberId) {
      throw new Error('Este número já é o configurado nesta caixa de entrada.')
    }

    // Impedir que duas inboxes da mesma org compartilhem o mesmo numero Meta
    const conflictingInbox = await db.inbox.findFirst({
      where: {
        organizationId: ctx.orgId,
        metaPhoneNumberId: parsedInput.phoneNumberId,
        id: { not: inbox.id },
      },
      select: { id: true, name: true },
    })

    if (conflictingInbox) {
      throw new Error(
        `Este número já está vinculado à caixa de entrada "${conflictingInbox.name}".`,
      )
    }

    // Defesa server-side: confirmar que o phoneNumberId pertence ao WABA da inbox.
    // Sem essa checagem, um client malicioso poderia forjar um ID de outro WABA.
    const wabaNumbers = await fetchWabaPhoneNumbers(inbox.metaWabaId, inbox.metaAccessToken)
    const targetNumber = wabaNumbers.find(
      (phoneNumber) => phoneNumber.id === parsedInput.phoneNumberId,
    )

    if (!targetNumber) {
      throw new Error('O número selecionado não pertence ao WABA conectado.')
    }

    await db.inbox.update({
      where: { id: inbox.id },
      data: {
        metaPhoneNumberId: parsedInput.phoneNumberId,
        metaPhoneDisplay: targetNumber.display_phone_number,
      },
    })

    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    // Agent usa metaPhoneNumberId para filtrar webhooks — invalidar quando inbox e vinculada
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { success: true, phoneDisplay: targetNumber.display_phone_number }
  })
