'use server'

import { revalidateTag } from 'next/cache'
import { Prisma } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { buildEvolutionGoWebhookUrl } from '@/_lib/evolution-go/instance-management'
import { saveEvolutionGoCredentialsSchema } from './schema'

export const saveEvolutionGoCredentials = orgActionClient
  .schema(saveEvolutionGoCredentialsSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Verificar que o inbox pertence à org (nunca confiar no client)
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: {
        id: true,
        agentId: true,
        evolutionApiKey: true,
        evolutionWebhookSecret: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Resolver token: se vazio no input, mantém o existente (edição sem alterar token)
    const resolvedToken = data.apiToken || inbox.evolutionApiKey
    if (!resolvedToken) {
      throw new Error('Token de autenticação obrigatório.')
    }

    // 4. Validar apenas autenticação: verifica se o servidor responde e o token é válido.
    // 404 é aceito — a instância pode ainda não existir no servidor (criada depois pelo usuário).
    // Evolution Go: apikey header = token da instância (identifica a instância automaticamente)
    const statusResponse = await fetch(`${data.apiUrl}/instance/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: resolvedToken,
      },
    }).catch(() => null)

    if (!statusResponse) {
      throw new Error(
        'Não foi possível conectar ao servidor Evolution Go. Verifique a URL.',
      )
    }

    if (statusResponse.status === 401 || statusResponse.status === 403) {
      throw new Error('Token inválido ou sem permissão no servidor Evolution Go.')
    }

    // 404 aceito — instância pode não existir ainda; qualquer outro erro de servidor bloqueia
    if (statusResponse.status !== 404 && !statusResponse.ok) {
      throw new Error(
        `Servidor Evolution Go retornou erro (${statusResponse.status}). Verifique a URL e tente novamente.`,
      )
    }

    // 5. Gerar webhookSecret apenas se ainda não existe (preserva em edições)
    const webhookSecret = inbox.evolutionWebhookSecret ?? crypto.randomUUID()

    // 6. Persistir credenciais
    try {
      await db.inbox.update({
        where: { id: inbox.id },
        data: {
          connectionType: 'EVOLUTION_GO',
          evolutionApiUrl: data.apiUrl,
          evolutionApiKey: resolvedToken,
          evolutionInstanceName: data.instanceName,
          evolutionInstanceId: data.instanceName,
          evolutionWebhookSecret: webhookSecret,
          evolutionConnected: false,
        },
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new Error('Esta instância já está vinculada a outra caixa de entrada.')
      }
      throw error
    }

    // 7. Invalidar cache
    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { success: true, webhookUrl: buildEvolutionGoWebhookUrl(webhookSecret) }
  })
