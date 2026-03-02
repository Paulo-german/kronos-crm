'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { importContactsSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  canPerformAction,
  requirePermission,
  resolveAssignedTo,
} from '@/_lib/rbac'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'

export const importContacts = orgActionClient
  .schema(importContactsSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: permissão para criar contatos
    requirePermission(canPerformAction(ctx, 'contact', 'create'))

    // 2. Quota: verificar se current + rows.length <= limit
    const quota = await checkPlanQuota(ctx.orgId, 'contact')
    if (quota.current + data.rows.length > quota.limit) {
      throw new Error(
        `Limite do plano insuficiente: você tem ${quota.current}/${quota.limit} contatos ` +
          `e está tentando importar ${data.rows.length}. ` +
          'Faça upgrade do plano para adicionar mais.',
      )
    }

    // 3. Ownership: MEMBER forçado para si mesmo
    const assignedTo = resolveAssignedTo(ctx, null)

    // 4. Buscar empresas existentes da org
    const existingCompanies = await db.company.findMany({
      where: { organizationId: ctx.orgId },
      select: { id: true, name: true },
    })

    // Mapa case-insensitive: nome normalizado → id
    const companyMap = new Map(
      existingCompanies.map((company) => [company.name.toLowerCase().trim(), company.id]),
    )

    // Identificar empresas novas (nomes não encontrados)
    const newCompanyNames = new Set<string>()
    for (const row of data.rows) {
      if (!row.companyName) continue
      const normalized = row.companyName.toLowerCase().trim()
      if (normalized && !companyMap.has(normalized)) {
        newCompanyNames.add(row.companyName.trim())
      }
    }

    // 5. Transação: criar empresas + contatos
    const result = await db.$transaction(async (tx) => {
      // Criar empresas novas e obter IDs
      for (const companyName of newCompanyNames) {
        const created = await tx.company.create({
          data: {
            name: companyName,
            organizationId: ctx.orgId,
          },
        })
        companyMap.set(companyName.toLowerCase().trim(), created.id)
      }

      // Criar contatos com companyId resolvido
      await tx.contact.createMany({
        data: data.rows.map((row) => {
          const companyId = row.companyName
            ? companyMap.get(row.companyName.toLowerCase().trim()) ?? null
            : null

          return {
            organizationId: ctx.orgId,
            assignedTo,
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            role: row.role || null,
            cpf: row.cpf || null,
            companyId,
            isDecisionMaker: row.isDecisionMaker ?? false,
          }
        }),
      })

      return { count: data.rows.length, companiesCreated: newCompanyNames.size }
    })

    // 6. Invalidar caches
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`companies:${ctx.orgId}`)

    return result
  })
