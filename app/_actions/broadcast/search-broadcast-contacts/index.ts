'use server'

import { Prisma } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, isElevated, requirePermission } from '@/_lib/rbac'
import { maskPhone } from '@/_lib/pii-mask'
import { searchBroadcastContactsSchema } from './schema'

// Página do lazy-load do seletor de contatos do disparo
const PAGE_SIZE = 30

export interface BroadcastContactOption {
  id: string
  name: string
  phone: string | null
}

export interface SearchBroadcastContactsResult {
  data: BroadcastContactOption[]
  page: number
  hasMore: boolean
}

export const searchBroadcastContacts = orgActionClient
  .schema(searchBroadcastContactsSchema)
  .action(
    async ({
      parsedInput: { query, page },
      ctx,
    }): Promise<SearchBroadcastContactsResult> => {
      // Quem monta o disparo precisa da permissão de criar broadcast
      requirePermission(canPerformAction(ctx, 'broadcast', 'create'))

      const elevated = isElevated(ctx.userRole)
      const masked = !elevated && (ctx.hidePiiFromMembers ?? false)

      // Elegibilidade do disparo: precisa ter telefone e não estar anonimizado.
      // Opt-out (ConsentEvent WITHDRAWN) é a salvaguarda final no create-broadcast,
      // que marca como SKIPPED — aqui evitamos o grosso (telefone/anonimizado).
      const where: Prisma.ContactWhereInput = {
        organizationId: ctx.orgId,
        phone: { not: null },
        anonymizedAt: null,
        ...(elevated ? {} : { assignedTo: ctx.userId }),
        ...(query.trim()
          ? {
              OR: [
                { name: { contains: query.trim(), mode: 'insensitive' } },
                { phone: { contains: query.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      }

      // take + 1 para detectar se há próxima página sem um count extra
      const rows = await db.contact.findMany({
        where,
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE + 1,
      })

      const hasMore = rows.length > PAGE_SIZE
      const data = rows.slice(0, PAGE_SIZE).map((contact) => ({
        id: contact.id,
        name: contact.name,
        phone: masked ? maskPhone(contact.phone) : contact.phone,
      }))

      return { data, page, hasMore }
    },
  )
