'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { setupWhatsappSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { createEvolutionInstance, buildWebhookUrl } from '@/_lib/evolution/instance-management'
import { resolveEvolutionCredentials } from '@/_lib/evolution/resolve-credentials'

export const setupWhatsapp = orgActionClient
  .schema(setupWhatsappSchema)
  .action(async ({ parsedInput: { inboxName }, ctx }) => {
    requirePermission(canPerformAction(ctx, 'inbox', 'create'))

    // Idempotente: reutiliza inbox WHATSAPP existente com instância conectada
    const existingInbox = await db.inbox.findFirst({
      where: {
        organizationId: ctx.orgId,
        channel: 'WHATSAPP',
      },
      select: {
        id: true,
        evolutionInstanceName: true,
      },
    })

    if (existingInbox?.evolutionInstanceName) {
      return {
        success: true,
        inboxId: existingInbox.id,
        instanceName: existingInbox.evolutionInstanceName,
        qrBase64: null,
        alreadyExists: true,
      }
    }

    // Criar inbox se não existe (sem instância ainda)
    const inbox = existingInbox ?? await db.inbox.create({
      data: {
        organizationId: ctx.orgId,
        name: inboxName,
        channel: 'WHATSAPP',
        isActive: true,
      },
      select: { id: true },
    })

    // Criar instância Evolution — se falhar, a inbox fica sem instância
    // e o user pode tentar novamente (idempotente)
    const instanceName = `kronos-${ctx.orgId.slice(0, 8)}-${inbox.id.slice(0, 8)}`

    try {
      // Onboarding cria instâncias na Evolution global (não é self-hosted)
      const credentials = await resolveEvolutionCredentials(inbox.id)
      const result = await createEvolutionInstance(instanceName, buildWebhookUrl(), credentials)

      await db.inbox.update({
        where: { id: inbox.id },
        data: {
          evolutionInstanceName: result.instanceName,
          evolutionInstanceId: result.instanceId,
        },
      })

      revalidateTag(`inboxes:${ctx.orgId}`)

      return {
        success: true,
        inboxId: inbox.id,
        instanceName: result.instanceName,
        qrBase64: result.qrBase64,
      }
    } catch (error) {
      console.error('[onboarding] Failed to create Evolution instance:', error)
      throw new Error(
        'Falha ao conectar com o servidor WhatsApp. Tente novamente.',
      )
    }
  })
