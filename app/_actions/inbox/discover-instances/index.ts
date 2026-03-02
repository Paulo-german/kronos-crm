'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { listEvolutionInstances, getEvolutionWebhook, updateEvolutionWebhook, buildWebhookUrl, deleteEvolutionInstance } from '@/_lib/evolution/instance-management'

const discoverInstancesSchema = z.object({})

export const discoverInstances = orgActionClient
  .schema(discoverInstancesSchema)
  .action(async ({ ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Rate limit: 1 requisição por minuto por organização
    const rateLimitKey = `discover-instances:${ctx.orgId}`
    const allowed = await redis.set(rateLimitKey, '1', 'EX', 60, 'NX')

    if (!allowed) {
      throw new Error('Aguarde 1 minuto entre buscas.')
    }

    // 3. Buscar todas as instâncias na Evolution
    const allInstances = await listEvolutionInstances()

    // 4. Filtrar por padrão da org: kronos-{orgId.slice(0,8)}-
    const orgPrefix = `kronos-${ctx.orgId.slice(0, 8)}-`
    const orgInstances = allInstances.filter((instance) =>
      instance.instanceName.startsWith(orgPrefix),
    )

    // 5. Buscar TODOS os inboxes da org (com e sem evolutionInstanceName)
    const allInboxes = await db.inbox.findMany({
      where: { organizationId: ctx.orgId },
      select: { id: true, evolutionInstanceName: true },
    })

    const trackedNames = new Set(
      allInboxes
        .filter((inbox) => inbox.evolutionInstanceName)
        .map((inbox) => inbox.evolutionInstanceName),
    )

    // IDs de inboxes desconectados (sem evolutionInstanceName)
    const disconnectedInboxIds = new Set(
      allInboxes
        .filter((inbox) => !inbox.evolutionInstanceName)
        .map((inbox) => inbox.id),
    )

    // 6. Calcular diff: instâncias na Evolution que não estão no DB
    const untracked = orgInstances.filter(
      (instance) => !trackedNames.has(instance.instanceName),
    )

    // 7. Separar órfãs reais de instâncias desconectadas intencionalmente
    // Naming pattern: kronos-{orgId8}-{inboxId8}
    const orphanInstances = []
    let orphansCleaned = 0

    for (const instance of untracked) {
      const parts = instance.instanceName.split('-')
      // Extrair o prefixo do inboxId (últimos 8 chars do UUID)
      const inboxIdPrefix = parts.length >= 3 ? parts[2] : null

      // Verificar se algum inbox desconectado corresponde ao prefixo
      const wasDisconnected = inboxIdPrefix
        ? [...disconnectedInboxIds].some((inboxId) => inboxId.startsWith(inboxIdPrefix))
        : false

      if (wasDisconnected) {
        // Instância de inbox desconectado intencionalmente — deletar da Evolution
        try {
          await deleteEvolutionInstance(instance.instanceName)
          orphansCleaned++
        } catch {
          // Best-effort
        }
      } else {
        orphanInstances.push(instance)
      }
    }

    // 8. Criar inbox para cada instância órfã real
    for (const instance of orphanInstances) {
      await db.inbox.create({
        data: {
          name: 'WhatsApp Importado',
          channel: 'WHATSAPP',
          isActive: true,
          organizationId: ctx.orgId,
          evolutionInstanceName: instance.instanceName,
          evolutionInstanceId: instance.instanceId,
        },
      })
    }

    // 9. Sync webhook URLs — corrige instâncias apontando para localhost ou URL antiga
    const expectedWebhookUrl = buildWebhookUrl()
    let webhooksUpdated = 0

    for (const instance of orgInstances) {
      try {
        const currentUrl = await getEvolutionWebhook(instance.instanceName)

        if (currentUrl !== expectedWebhookUrl) {
          await updateEvolutionWebhook(instance.instanceName, expectedWebhookUrl)
          webhooksUpdated++
        }
      } catch (error) {
        console.error('[discover-instances] webhook sync failed', {
          instance: instance.instanceName,
          error: error instanceof Error ? error.message : error,
        })
      }
    }

    // 9. Invalidar cache
    revalidateTag(`inboxes:${ctx.orgId}`)

    return {
      found: orgInstances.length,
      imported: orphanInstances.length,
      orphansCleaned,
      webhooksUpdated,
    }
  })
