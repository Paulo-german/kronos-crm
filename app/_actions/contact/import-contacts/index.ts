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
import type { CustomerStatus, LifecycleStage } from '@prisma/client'
import type { ImportRow } from './schema'

function resolveLifecycleTimestamps(stage: LifecycleStage, now: Date) {
  return {
    qualifiedAt: ['QUALIFIED', 'OPPORTUNITY', 'CUSTOMER'].includes(stage) ? now : null,
    becameOpportunityAt: ['OPPORTUNITY', 'CUSTOMER'].includes(stage) ? now : null,
    becameCustomerAt: stage === 'CUSTOMER' ? now : null,
  }
}

function resolveCustomerStatus(stage: LifecycleStage): CustomerStatus {
  return stage === 'CUSTOMER' ? 'ACTIVE' : 'NEVER_BOUGHT'
}

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

    // 3.1 Blocklist: remover linhas cujo email foi removido a pedido do titular (LGPD/GDPR).
    // Skip silencioso — não rejeita o lote inteiro por causa de linhas bloqueadas.
    const importEmails = data.rows
      .map((row) => row.email?.toLowerCase().trim())
      .filter((email): email is string => Boolean(email))

    const blockedEmailRows = importEmails.length
      ? await db.emailBlocklist.findMany({
          where: { organizationId: ctx.orgId, email: { in: importEmails } },
          select: { email: true },
        })
      : []

    const blockedEmails = new Set(blockedEmailRows.map((row) => row.email))

    const allowedRows: ImportRow[] = data.rows.filter((row) => {
      const normalizedEmail = row.email?.toLowerCase().trim()
      if (!normalizedEmail) return true
      return !blockedEmails.has(normalizedEmail)
    })

    const skipped = data.rows.length - allowedRows.length

    if (allowedRows.length === 0) {
      return { count: 0, companiesCreated: 0, skipped }
    }

    // 4. Buscar empresas existentes da org
    const existingCompanies = await db.company.findMany({
      where: { organizationId: ctx.orgId },
      select: { id: true, name: true },
    })

    const companyMap = new Map(
      existingCompanies.map((company) => [company.name.toLowerCase().trim(), company.id]),
    )

    const newCompanyNames = new Set<string>()
    for (const row of allowedRows) {
      if (!row.companyName) continue
      const normalized = row.companyName.toLowerCase().trim()
      if (normalized && !companyMap.has(normalized)) {
        newCompanyNames.add(row.companyName.trim())
      }
    }

    const now = new Date()
    const lifecycleTimestamps = resolveLifecycleTimestamps(data.lifecycleStage, now)
    const customerStatus = resolveCustomerStatus(data.lifecycleStage)

    // 5. Transação: criar empresas + contatos + histórico de lifecycle
    const result = await db.$transaction(async (tx) => {
      for (const companyName of newCompanyNames) {
        const created = await tx.company.create({
          data: {
            name: companyName,
            organizationId: ctx.orgId,
          },
        })
        companyMap.set(companyName.toLowerCase().trim(), created.id)
      }

      const createdContacts = await tx.contact.createManyAndReturn({
        data: allowedRows.map((row) => {
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
            companyId,
            isDecisionMaker: row.isDecisionMaker ?? false,
            lifecycleStage: data.lifecycleStage,
            customerStatus,
            firstCaptureChannel: 'IMPORT',
            firstCaptureAt: now,
            ...lifecycleTimestamps,
          }
        }),
        select: { id: true },
      })

      // Registrar entrada no histórico de lifecycle para cada contato
      const causeType = data.lifecycleStage === 'LEAD' ? 'CONTACT_CREATED' : 'BACKFILL'
      await tx.contactLifecycleHistory.createMany({
        data: createdContacts.map((contact) => ({
          contactId: contact.id,
          organizationId: ctx.orgId,
          fromStage: null,
          toStage: data.lifecycleStage,
          causeType,
        })),
      })

      // Privacidade em batch: createManyAndReturn devolve os ids para o ConsentEvent.
      // Base legal vem da seleção do operador (sobrescreve o default de IMPORT).
      const createdPrivacies = await tx.contactPrivacy.createManyAndReturn({
        data: createdContacts.map((contact) => ({
          contactId: contact.id,
          legalBasis: data.legalBasis,
          legalBasisSource: 'IMPORT' as const,
          consentedAt: data.legalBasis === 'CONSENT' ? new Date() : null,
        })),
        select: { id: true, contactId: true, legalBasis: true, legalBasisSource: true },
      })

      await tx.consentEvent.createMany({
        data: createdPrivacies.map((privacy) => ({
          contactId: privacy.contactId,
          privacyId: privacy.id,
          eventType: 'GRANTED' as const,
          legalBasis: privacy.legalBasis,
          legalBasisSource: privacy.legalBasisSource,
          performedBy: ctx.userId,
        })),
      })

      return { count: allowedRows.length, companiesCreated: newCompanyNames.size }
    })

    // 6. Invalidar caches
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`companies:${ctx.orgId}`)
    revalidateTag(`privacy:${ctx.orgId}`)

    return { ...result, skipped }
  })
