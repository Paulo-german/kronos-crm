'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac/guards'
import { getInboxMetaCredentials } from '@/_data-access/inbox/get-inbox-meta-credentials'
import { fetchMetaTemplates } from '@/_lib/meta/template-api'
import type { MetaTemplate } from '@/_lib/meta/types'
import { listWhatsAppTemplatesSchema } from './schema'

/**
 * Action para listar (e sincronizar manualmente) templates WhatsApp de um inbox META_CLOUD.
 * Chama diretamente a Graph API e invalida o cache, forçando a lista atualizada.
 */
export const listWhatsAppTemplates = orgActionClient
  .schema(listWhatsAppTemplatesSchema)
  .action(async ({ parsedInput: data, ctx }): Promise<MetaTemplate[]> => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'read'))

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

    // 3. Buscar credenciais (sem cache — dado sensível)
    const credentials = await getInboxMetaCredentials(data.inboxId, ctx.orgId)

    if (!credentials) {
      throw new Error('Credenciais Meta Cloud não configuradas para este inbox.')
    }

    // 4. Buscar templates diretamente da Graph API
    const response = await fetchMetaTemplates(credentials.wabaId, credentials.accessToken)

    // 5. Invalidar cache para que a UI reflita os dados mais recentes
    revalidateTag(`whatsapp-templates:${data.inboxId}`)

    return response.data
  })
