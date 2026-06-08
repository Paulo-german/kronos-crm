'use server'

import { ownerActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { toggleSupportAgentSchema } from './schema'
import { revalidateTag } from 'next/cache'

const CONFIRMATION_WORD = 'CONFIRMAR'

export const toggleSupportAgent = ownerActionClient
  .schema(toggleSupportAgentSchema)
  .action(async ({ parsedInput: { userId, adminKey, confirmation } }) => {
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

    // Invalidar cache do usuário-alvo (isSupportAgent é cacheado em get-user-by-id)
    revalidateTag(`user:${userId}`)

    return {
      success: true,
      isSupportAgent: !user.isSupportAgent,
    }
  })
