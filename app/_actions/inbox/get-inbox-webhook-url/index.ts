'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { buildSelfHostedWebhookUrl } from '@/_lib/evolution-js/instance-management'
import { buildEvolutionGoWebhookUrl } from '@/_lib/evolution-go/instance-management'
import { getInboxWebhookUrlSchema } from './schema'

/**
 * Revela a URL de webhook (com secret) sob demanda.
 *
 * O secret nunca viaja no payload RSC da página — só chega ao client quando
 * um usuário com permissão de gerenciar inboxes solicita explicitamente.
 */
export const getInboxWebhookUrl = orgActionClient
  .schema(getInboxWebhookUrlSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Verificar que o inbox pertence à org (nunca confiar no client)
    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { connectionType: true, evolutionWebhookSecret: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (!inbox.evolutionWebhookSecret) {
      return { webhookUrl: null }
    }

    // 3. Montar a URL conforme o provider (Meta/Z-API/Simulator não usam webhook Evolution)
    if (inbox.connectionType === 'EVOLUTION_GO') {
      return {
        webhookUrl: buildEvolutionGoWebhookUrl(inbox.evolutionWebhookSecret),
      }
    }

    if (
      inbox.connectionType === 'EVOLUTION' ||
      inbox.connectionType === 'EVOLUTION_JS'
    ) {
      return {
        webhookUrl: buildSelfHostedWebhookUrl(inbox.evolutionWebhookSecret),
      }
    }

    return { webhookUrl: null }
  })
