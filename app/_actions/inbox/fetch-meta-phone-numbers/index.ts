'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { fetchWabaPhoneNumbers } from '@/_lib/meta/fetch-waba-phone-numbers'
import { fetchMetaPhoneNumbersSchema } from './schema'
import type { WabaPhoneNumberDto } from '@/_lib/meta/types'

export const fetchMetaPhoneNumbers = orgActionClient
  .schema(fetchMetaPhoneNumbersSchema)
  .action(async ({ parsedInput, ctx }): Promise<{ phoneNumbers: WabaPhoneNumberDto[] }> => {
    // Mesma permissao usada por connectMeta — so OWNER e ADMIN gerenciam conexoes
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    const inbox = await db.inbox.findFirst({
      where: { id: parsedInput.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
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

    const wabaNumbers = await fetchWabaPhoneNumbers(inbox.metaWabaId, inbox.metaAccessToken)

    // Buscar todas as inboxes da org que ja tem algum dos numeros retornados configurado
    const phoneIds = wabaNumbers.map((phoneNumber) => phoneNumber.id)
    const existingInboxes = await db.inbox.findMany({
      where: {
        organizationId: ctx.orgId,
        metaPhoneNumberId: { in: phoneIds },
      },
      select: { id: true, name: true, metaPhoneNumberId: true },
    })

    // Mapa phoneNumberId → inbox para lookup O(1)
    const usageMap = new Map(
      existingInboxes
        .filter((row): row is typeof row & { metaPhoneNumberId: string } =>
          row.metaPhoneNumberId !== null,
        )
        .map((row) => [row.metaPhoneNumberId, row]),
    )

    const phoneNumbers: WabaPhoneNumberDto[] = wabaNumbers.map((phoneNumber) => {
      const usage = usageMap.get(phoneNumber.id)
      const isCurrent = phoneNumber.id === inbox.metaPhoneNumberId

      return {
        id: phoneNumber.id,
        displayPhoneNumber: phoneNumber.display_phone_number,
        verifiedName: phoneNumber.verified_name,
        qualityRating: phoneNumber.quality_rating,
        codeVerificationStatus: phoneNumber.code_verification_status ?? null,
        isCurrentInbox: isCurrent,
        // Numero em uso por OUTRA inbox (nao pela atual)
        inUseByInboxId: !isCurrent && usage ? usage.id : null,
        inUseByInboxName: !isCurrent && usage ? usage.name : null,
      }
    })

    return { phoneNumbers }
  })
