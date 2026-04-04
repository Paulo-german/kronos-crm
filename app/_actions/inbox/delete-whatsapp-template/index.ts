'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac/guards'
import { getInboxMetaCredentials } from '@/_data-access/inbox/get-inbox-meta-credentials'
import { deleteMetaTemplate } from '@/_lib/meta/template-api'
import { deleteWhatsAppTemplateSchema } from './schema'

/**
 * Action para deletar um template WhatsApp via Meta Graph API.
 * Deleta TODAS as versoes de lingua do template com aquele nome.
 */
export const deleteWhatsAppTemplate = orgActionClient
  .schema(deleteWhatsAppTemplateSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Validar inbox pertence à org e é META_CLOUD
    const inbox = await db.inbox.findFirst({
      where: {
        id: data.inboxId,
        organizationId: ctx.orgId,
        connectionType: 'META_CLOUD',
      },
      select: { id: true },
    })

    if (!inbox) {
      throw new Error('Inbox não encontrado ou não é do tipo Meta Cloud.')
    }

    // 3. Buscar credenciais
    const credentials = await getInboxMetaCredentials(data.inboxId, ctx.orgId)

    if (!credentials) {
      throw new Error('Credenciais Meta Cloud não configuradas para este inbox.')
    }

    // 4. Deletar template na Graph API
    await deleteMetaTemplate(credentials.wabaId, credentials.accessToken, data.templateName)

    // 5. Invalidar cache
    revalidateTag(`whatsapp-templates:${data.inboxId}`)

    return { success: true }
  })
