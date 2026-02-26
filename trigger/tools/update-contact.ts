import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import { logger } from '@trigger.dev/sdk/v3'
import type { ToolContext } from './types'

interface UpdateContactResult {
  success: boolean
  message: string
}

export function createUpdateContactTool(ctx: ToolContext) {
  return tool({
    description:
      'Atualiza dados de um contato (nome, email, telefone, cargo). Use quando o cliente fornecer informações novas sobre si.',
    inputSchema: z.object({
      name: z.string().optional().describe('Nome completo do contato'),
      email: z.string().email().optional().describe('Email do contato'),
      phone: z.string().optional().describe('Telefone do contato'),
      role: z.string().optional().describe('Cargo/função do contato'),
    }),
    execute: async (updates): Promise<UpdateContactResult> => {
      const data: Record<string, string | null> = {}
      const updatedFields: string[] = []

      if (updates.name !== undefined) {
        data.name = updates.name
        updatedFields.push('nome')
      }
      if (updates.email !== undefined) {
        data.email = updates.email || null
        updatedFields.push('email')
      }
      if (updates.phone !== undefined) {
        data.phone = updates.phone || null
        updatedFields.push('telefone')
      }
      if (updates.role !== undefined) {
        data.role = updates.role || null
        updatedFields.push('cargo')
      }

      if (updatedFields.length === 0) {
        return { success: false, message: 'Nenhum campo para atualizar.' }
      }

      await db.contact.update({
        where: { id: ctx.contactId },
        data,
      })

      logger.info('Tool update_contact executed', {
        contactId: ctx.contactId,
        updatedFields,
        conversationId: ctx.conversationId,
      })

      return {
        success: true,
        message: `Campos atualizados: ${updatedFields.join(', ')}.`,
      }
    },
  })
}
