'use server'

import { ownerActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { toggleSupportAgentSchema } from './schema'

const CONFIRMATION_WORD = 'CONFIRMAR'

export const toggleSupportAgent = ownerActionClient
  .schema(toggleSupportAgentSchema)
  .action(async ({ parsedInput: { userId, adminKey, confirmation }, ctx }) => {
    if (userId === ctx.userId) {
      throw new Error('Você não pode alterar seu próprio status de agente de suporte.')
    }

    const supportAgentKey = process.env.SUPPORT_AGENT_KEY
    if (!supportAgentKey || adminKey !== supportAgentKey) {
      throw new Error('Senha incorreta.')
    }

    if (confirmation !== CONFIRMATION_WORD) {
      throw new Error(`Digite "${CONFIRMATION_WORD}" exatamente para confirmar.`)
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { isSupportAgent: true },
    })

    if (!user) {
      throw new Error('Usuário não encontrado.')
    }

    await db.user.update({
      where: { id: userId },
      data: { isSupportAgent: !user.isSupportAgent },
    })

    return {
      success: true,
      isSupportAgent: !user.isSupportAgent,
    }
  })
