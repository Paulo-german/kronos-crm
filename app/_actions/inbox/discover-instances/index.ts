'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { redis } from '@/_lib/redis'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { listEvolutionInstances } from '@/_lib/evolution/instance-management'

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

    // 5. Buscar inboxes existentes que já têm evolutionInstanceName
    const existingInboxes = await db.inbox.findMany({
      where: {
        organizationId: ctx.orgId,
        evolutionInstanceName: { not: null },
      },
      select: { evolutionInstanceName: true },
    })

    const trackedNames = new Set(
      existingInboxes.map((inbox) => inbox.evolutionInstanceName),
    )

    // 6. Calcular diff: instâncias na Evolution que não estão no DB
    const orphanInstances = orgInstances.filter(
      (instance) => !trackedNames.has(instance.instanceName),
    )

    // 7. Criar inbox para cada instância não rastreada
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

    // 8. Invalidar cache
    revalidateTag(`inboxes:${ctx.orgId}`)

    return {
      found: orgInstances.length,
      imported: orphanInstances.length,
    }
  })
