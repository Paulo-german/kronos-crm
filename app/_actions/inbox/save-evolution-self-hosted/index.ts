'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { evolutionSelfHostedSchema } from './schema'

export const saveEvolutionSelfHosted = orgActionClient
  .schema(evolutionSelfHostedSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Verificar que o inbox pertence à org (nunca confiar no client)
    const inbox = await db.inbox.findFirst({
      where: { id: data.inboxId, organizationId: ctx.orgId },
      select: { id: true, evolutionApiKey: true, evolutionWebhookSecret: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Resolver API Key: se vazia no input, manter a existente (edição sem alterar key)
    const resolvedApiKey = data.evolutionApiKey || inbox.evolutionApiKey
    if (!resolvedApiKey) {
      throw new Error('API Key obrigatória.')
    }

    // 4. Testar conexão com as credenciais antes de salvar
    const testResponse = await fetch(
      `${data.evolutionApiUrl}/instance/fetchInstances`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: resolvedApiKey,
        },
      },
    ).catch(() => null)

    if (!testResponse || !testResponse.ok) {
      throw new Error(
        'Não foi possível conectar à Evolution API. Verifique a URL e a API Key.',
      )
    }

    // 5. Gerar secret apenas se ainda não existe (preserva em edições)
    const webhookSecret = inbox.evolutionWebhookSecret ?? crypto.randomUUID()

    // 6. Salvar credenciais no banco
    await db.inbox.update({
      where: { id: inbox.id },
      data: {
        evolutionApiUrl: data.evolutionApiUrl,
        evolutionApiKey: resolvedApiKey,
        evolutionWebhookSecret: webhookSecret,
      },
    })

    // 6. Invalidar cache
    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    return { success: true, webhookSecret }
  })
