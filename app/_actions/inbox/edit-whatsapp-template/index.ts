'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac/guards'
import { getInboxMetaCredentials } from '@/_data-access/inbox/get-inbox-meta-credentials'
import { editMetaTemplate } from '@/_lib/meta/template-api'
import type { MetaTemplateComponent } from '@/_lib/meta/types'
import { editWhatsAppTemplateSchema } from './schema'

/**
 * Action para editar um template WhatsApp existente via Meta Graph API.
 * Somente components podem ser alterados — name/language/category sao imutaveis.
 * Templates APPROVED podem ter components editados (entra em re-review).
 * Templates REJECTED/PAUSED podem ser corrigidos e reenviados.
 */
export const editWhatsAppTemplate = orgActionClient
  .schema(editWhatsAppTemplateSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Validar inbox pertence a org e é META_CLOUD
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

    // 4. Montar components no formato da Graph API
    const components: MetaTemplateComponent[] = []

    if (data.components.header) {
      const header = data.components.header
      const headerComponent: MetaTemplateComponent = {
        type: 'HEADER',
        format: header.format,
      }

      if (header.format === 'TEXT' && header.text) {
        headerComponent.text = header.text
      }

      if (header.exampleMediaHandle) {
        headerComponent.example = { header_handle: [header.exampleMediaHandle] }
      }

      components.push(headerComponent)
    }

    const bodyComponent: MetaTemplateComponent = {
      type: 'BODY',
      text: data.components.body.text,
    }

    if (data.components.body.examples && data.components.body.examples.length > 0) {
      bodyComponent.example = {
        body_text: [data.components.body.examples],
      }
    }

    components.push(bodyComponent)

    if (data.components.footer) {
      components.push({
        type: 'FOOTER',
        text: data.components.footer.text,
      })
    }

    // 5. Editar template na Graph API (somente components)
    await editMetaTemplate(
      credentials.wabaId,
      credentials.accessToken,
      data.templateId,
      components,
    )

    // 6. Invalidar cache
    revalidateTag(`whatsapp-templates:${data.inboxId}`)

    return { success: true }
  })
