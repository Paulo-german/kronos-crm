'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac/guards'
import { getInboxMetaCredentials } from '@/_data-access/inbox/get-inbox-meta-credentials'
import { uploadTemplateMedia } from '@/_lib/meta/template-api'
import { uploadTemplateMediaSchema } from './schema'

/**
 * Action para fazer upload de midia (IMAGE, VIDEO, DOCUMENT) para uso em headers de templates.
 * Retorna o handle da midia para incluir no campo exampleMediaHandle do schema de criacao.
 */
export const uploadTemplateMediaAction = orgActionClient
  .schema(uploadTemplateMediaSchema)
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

    // 4. Fazer upload da midia via Resumable Upload API e obter handle
    const handle = await uploadTemplateMedia(
      credentials.accessToken,
      data.fileBase64,
      data.fileLength,
      data.fileType,
    )

    return { success: true, handle }
  })
