'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateOrganizationSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import type { PersonType } from '@prisma/client'

export const updateOrganization = orgActionClient
  .schema(updateOrganizationSchema)
  .action(async ({ parsedInput, ctx }) => {
    // 1. Verificar permissão (apenas ADMIN/OWNER)
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    const {
      name,
      personType,
      taxId,
      legalName,
      tradeName,
      isSimples,
      billingContactName,
      billingContactEmail,
      billingContactPhone,
      billingZipCode,
      billingStreet,
      billingNumber,
      billingComplement,
      billingNeighborhood,
      billingCity,
      billingState,
      billingCountry,
    } = parsedInput

    // 2. Buscar org atual para obter o slug (para invalidação de cache)
    const org = await db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { slug: true },
    })

    if (!org) {
      throw new Error('Organização não encontrada.')
    }

    // 3. Preparar dados para atualização
    // Limpar campos PJ-only quando for PF
    const isPF = personType === 'PF'

    // 4. Atualizar organização
    await db.organization.update({
      where: { id: ctx.orgId },
      data: {
        name,
        personType: personType as PersonType | null,
        taxId: taxId || null,
        legalName: legalName || null,
        tradeName: isPF ? null : (tradeName || null),
        isSimples: isPF ? false : (isSimples ?? false),
        billingContactName: billingContactName || null,
        billingContactEmail: billingContactEmail || null,
        billingContactPhone: billingContactPhone || null,
        billingZipCode: billingZipCode || null,
        billingStreet: billingStreet || null,
        billingNumber: billingNumber || null,
        billingComplement: billingComplement || null,
        billingNeighborhood: billingNeighborhood || null,
        billingCity: billingCity || null,
        billingState: billingState || null,
        billingCountry: billingCountry || null,
      },
    })

    // 5. Invalidar caches relevantes
    revalidateTag(`organization:${org.slug}`)
    revalidateTag(`user-orgs:${ctx.userId}`)

    return { success: true }
  })
