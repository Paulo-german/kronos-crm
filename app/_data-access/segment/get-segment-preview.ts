import 'server-only'
import { db } from '@/_lib/prisma'
import type { LifecycleStage, Prisma } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildContactFilterWhere } from '@/_data-access/contact/build-contact-filter-where'
import type { ContactFilters } from '@/_components/contacts/_lib/contact-filters'

// Quantos contatos retornar na amostra do painel de resultado
const SAMPLE_SIZE = 6

export interface SegmentPreviewContact {
  id: string
  name: string
  lifecycleStage: LifecycleStage
  healthScore: number | null
}

export interface SegmentPreview {
  count: number
  sample: SegmentPreviewContact[]
}

/**
 * Preview ao vivo de um segmento: contagem total + amostra de contatos.
 * Aplica a elegibilidade de disparo (telefone presente, não anonimizado) e o
 * RBAC do contato. Só é exposto a OWNER/ADMIN (a tela de segmentações já
 * redireciona os demais), então a amostra pode exibir nomes sem mascarar PII.
 */
export const getSegmentPreview = async (
  ctx: RBACContext,
  filters: ContactFilters,
): Promise<SegmentPreview> => {
  const elevated = isElevated(ctx.userRole)

  const where: Prisma.ContactWhereInput = {
    organizationId: ctx.orgId,
    // Elegibilidade de disparo (mesma regra do search-broadcast-contacts)
    phone: { not: null },
    anonymizedAt: null,
    // RBAC: MEMBER conta só os próprios contatos
    ...(elevated ? {} : { assignedTo: ctx.userId }),
    // Filtros nativos do segmento
    ...buildContactFilterWhere(filters),
  }

  const [count, sample] = await Promise.all([
    db.contact.count({ where }),
    db.contact.findMany({
      where,
      take: SAMPLE_SIZE,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        lifecycleStage: true,
        healthScore: true,
      },
    }),
  ])

  return {
    count,
    sample: sample.map((contact) => ({
      id: contact.id,
      name: contact.name ?? 'Sem nome',
      lifecycleStage: contact.lifecycleStage,
      healthScore: contact.healthScore,
    })),
  }
}
