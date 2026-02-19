import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { Plan } from '@prisma/client'
import { db } from '@/_lib/prisma'

// Mapeamento de entidade RBAC para feature key no catálogo
export type QuotaEntity = 'contact' | 'deal' | 'product' | 'member'

// Slug do plano efetivo (usado pela UI)
export type PlanType = 'light' | 'essential' | 'scale' | 'enterprise'

const ENTITY_FEATURE_MAP: Record<QuotaEntity, string> = {
  contact: 'crm.max_contacts',
  deal: 'crm.max_deals',
  product: 'crm.max_products',
  member: 'crm.max_members',
}

/**
 * Resolve o plano efetivo da organização:
 * 1. Subscription ativa/trialing com planId → retorna o plan vinculado
 * 2. trialEndsAt no futuro → retorna o plano 'essential' do DB
 * 3. Nenhum → null (bloqueia quota)
 */
const getEffectivePlan = cache(async (orgId: string): Promise<Plan | null> => {
  const getCachedPlan = unstable_cache(
    async () => {
      const subscription = await db.subscription.findFirst({
        where: {
          organizationId: orgId,
          status: { in: ['active', 'trialing'] },
        },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      })

      if (subscription?.plan) {
        return subscription.plan
      }

      // Fallback para trial da org
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { trialEndsAt: true },
      })

      if (org?.trialEndsAt && org.trialEndsAt > new Date()) {
        return db.plan.findUnique({ where: { slug: 'essential' } })
      }

      return null
    },
    [`effective-plan-${orgId}`],
    {
      tags: [`subscriptions:${orgId}`],
      revalidate: 3600,
    },
  )

  return getCachedPlan()
})

/**
 * Lê o limite numérico de uma feature para um plano do banco de dados.
 * Retorna 0 se não encontrado.
 */
const getPlanLimit = cache(async (planId: string, featureKey: string): Promise<number> => {
  const getCachedLimit = unstable_cache(
    async () => {
      const planLimit = await db.planLimit.findFirst({
        where: {
          planId,
          feature: { key: featureKey },
        },
        select: { valueNumber: true },
      })

      return planLimit?.valueNumber ?? 0
    },
    [`plan-limit-${planId}-${featureKey}`],
    {
      tags: ['plan-limits'],
      revalidate: 3600,
    },
  )

  return getCachedLimit()
})

/**
 * Conta registros existentes para uma entidade
 */
async function countRecords(orgId: string, entity: QuotaEntity): Promise<number> {
  switch (entity) {
    case 'contact':
      return db.contact.count({ where: { organizationId: orgId } })
    case 'deal':
      return db.deal.count({ where: { organizationId: orgId } })
    case 'product':
      return db.product.count({ where: { organizationId: orgId } })
    case 'member':
      // Conta ACCEPTED + PENDING para que convites pendentes consumam a quota
      return db.member.count({
        where: { organizationId: orgId, status: { in: ['ACCEPTED', 'PENDING'] } },
      })
    default:
      return 0
  }
}

/**
 * Verifica se a organização ainda tem quota disponível para a entidade
 */
export async function checkPlanQuota(
  orgId: string,
  entity: QuotaEntity,
): Promise<{ withinQuota: boolean; current: number; limit: number }> {
  const plan = await getEffectivePlan(orgId)

  if (!plan) {
    return { withinQuota: false, current: 0, limit: 0 }
  }

  const featureKey = ENTITY_FEATURE_MAP[entity]
  const limit = await getPlanLimit(plan.id, featureKey)
  const current = await countRecords(orgId, entity)

  return {
    withinQuota: current < limit,
    current,
    limit,
  }
}

/**
 * Retorna o slug do plano efetivo da organização, para uso na UI.
 * Retorna null quando a org não tem plano ativo nem trial.
 */
export async function getPlanLimits(orgId: string): Promise<{ plan: PlanType | null }> {
  const plan = await getEffectivePlan(orgId)

  if (!plan) {
    return { plan: null }
  }

  return { plan: plan.slug as PlanType }
}

/**
 * Lança erro se a quota foi excedida.
 * Use antes de criar novos registros.
 */
export async function requireQuota(orgId: string, entity: QuotaEntity): Promise<void> {
  const plan = await getEffectivePlan(orgId)

  if (!plan) {
    throw new Error('Assine um plano para continuar.')
  }

  const featureKey = ENTITY_FEATURE_MAP[entity]
  const limit = await getPlanLimit(plan.id, featureKey)
  const current = await countRecords(orgId, entity)

  if (current >= limit) {
    const entityLabels: Record<QuotaEntity, string> = {
      contact: 'contatos',
      deal: 'negócios',
      product: 'produtos',
      member: 'membros',
    }

    throw new Error(
      `Limite do plano atingido: você tem ${current}/${limit} ${entityLabels[entity]}. ` +
        'Faça upgrade do plano para adicionar mais.',
    )
  }
}
