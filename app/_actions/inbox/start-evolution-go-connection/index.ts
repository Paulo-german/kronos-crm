'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import {
  connectEvolutionGoInstance,
  buildEvolutionGoWebhookUrl,
} from '@/_lib/evolution-go/instance-management'
import { resolveEvolutionGoCredentials } from '@/_lib/evolution-go/resolve-credentials'
import { startEvolutionGoConnectionSchema } from './schema'

/**
 * Dispara a conexão de uma instância Evolution Go — chamado UMA VEZ quando o usuário
 * clica em "Conectar WhatsApp". Usa POST /instance/connect para iniciar o pareamento
 * e retorna o QR inicial.
 * O polling subsequente usa getEvolutionGoQr (GET puro, sem POST).
 */
export const startEvolutionGoConnection = orgActionClient
  .schema(startEvolutionGoConnectionSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: {
        evolutionInstanceName: true,
        evolutionWebhookSecret: true,
        connectionType: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (inbox.connectionType !== 'EVOLUTION_GO' || !inbox.evolutionInstanceName) {
      throw new Error('Esta caixa de entrada não possui instância Evolution Go.')
    }

    const credentials = await resolveEvolutionGoCredentials(inboxId)

    const webhookUrl = inbox.evolutionWebhookSecret
      ? buildEvolutionGoWebhookUrl(inbox.evolutionWebhookSecret)
      : undefined

    const result = await connectEvolutionGoInstance(
      inbox.evolutionInstanceName,
      credentials,
      webhookUrl,
    )

    return {
      base64: result.base64,
      code: result.code,
      pairingCode: result.pairingCode,
      state: result.state,
    }
  })
