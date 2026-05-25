'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resolveEvolutionGoCredentials } from '@/_lib/evolution-go/resolve-credentials'
import { getEvolutionGoInstanceStatus } from '@/_lib/evolution-go/instance-management'
import { testEvolutionGoConnectionSchema } from './schema'

export const testEvolutionGoConnection = orgActionClient
  .schema(testEvolutionGoConnectionSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    // 1. RBAC — leitura suficiente para teste diagnóstico
    requirePermission(canPerformAction(ctx, 'inbox', 'read'))

    // 2. Verificar que o inbox pertence à org
    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { id: true, agentId: true, evolutionInstanceName: true, evolutionConnected: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    if (!inbox.evolutionInstanceName) {
      return {
        success: false as const,
        error: 'Nenhuma instância vinculada a esta caixa de entrada.',
      }
    }

    const credentials = await resolveEvolutionGoCredentials(inboxId)

    // 3. Usar o mesmo helper que os demais fluxos Evolution Go — trata 404 (null) e lança em 401/403
    const statusResult = await getEvolutionGoInstanceStatus(
      inbox.evolutionInstanceName,
      credentials,
    ).catch((error: Error) => {
      throw new Error(`Não foi possível consultar a instância: ${error.message}`)
    })

    // Instância não existe no servidor
    if (!statusResult) {
      return {
        success: false as const,
        error: `Instância "${inbox.evolutionInstanceName}" não encontrada no servidor Evolution Go.`,
      }
    }

    const state = statusResult.state
    const connected = state === 'open'

    // 4. Sincronizar evolutionConnected no banco se divergir do estado real
    if (inbox.evolutionConnected !== connected) {
      await db.inbox.update({
        where: { id: inbox.id },
        data: { evolutionConnected: connected },
      })
      revalidateTag(`inbox:${inbox.id}`)
      revalidateTag(`inboxes:${ctx.orgId}`)
      if (inbox.agentId) {
        revalidateTag(`agent:${inbox.agentId}`)
        revalidateTag(`agents:${ctx.orgId}`)
      }
    }

    return { success: true as const, state }
  })
