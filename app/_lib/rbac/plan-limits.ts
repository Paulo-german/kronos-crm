import type { PlanLimits } from './types'
import { db } from '@/_lib/prisma'

/**
 * Tipo local para identificar o plano, derivado do metadata.product_key da subscription ativa
 */
export type PlanType = 'free' | 'pro' | 'enterprise'

/**
 * Limites por plano
 */
const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    contacts: 50,
    deals: 25,
    products: 10,
    members: 2,
  },
  pro: {
    contacts: 1000,
    deals: 500,
    products: 100,
    members: 10,
  },
  enterprise: {
    contacts: Infinity,
    deals: Infinity,
    products: Infinity,
    members: Infinity,
  },
}

// Mapeamento de entidade RBAC para nome da tabela (apenas para entidades com quota)
type QuotaEntity = 'contact' | 'deal' | 'product' | 'member'

const ENTITY_TO_LIMIT_KEY: Record<QuotaEntity, keyof PlanLimits> = {
  contact: 'contacts',
  deal: 'deals',
  product: 'products',
  member: 'members',
}

/**
 * Obtém o plano atual de uma organização a partir da subscription ativa.
 * Se não houver subscription ativa, retorna 'free'.
 */
async function getOrganizationPlan(orgId: string): Promise<PlanType> {
  const subscription = await db.subscription.findFirst({
    where: {
      organizationId: orgId,
      status: { in: ['active', 'trialing'] },
    },
    select: { metadata: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!subscription?.metadata) return 'free'

  const metadata = subscription.metadata as Record<string, unknown>
  const productKey = metadata.product_key as string | undefined

  if (productKey === 'pro') return 'pro'
  if (productKey === 'enterprise') return 'enterprise'

  return 'free'
}

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
  entity: QuotaEntity
): Promise<{ withinQuota: boolean; current: number; limit: number }> {
  const plan = await getOrganizationPlan(orgId)
  const limits = PLAN_LIMITS[plan]
  const limitKey = ENTITY_TO_LIMIT_KEY[entity]
  const limit = limits[limitKey]

  const current = await countRecords(orgId, entity)

  return {
    withinQuota: current < limit,
    current,
    limit,
  }
}

/**
 * Lança erro se a quota foi excedida
 * Use antes de criar novos registros
 */
export async function requireQuota(
  orgId: string,
  entity: QuotaEntity
): Promise<void> {
  const { withinQuota, current, limit } = await checkPlanQuota(orgId, entity)

  if (!withinQuota) {
    const entityLabels: Record<QuotaEntity, string> = {
      contact: 'contatos',
      deal: 'negócios',
      product: 'produtos',
      member: 'membros',
    }

    throw new Error(
      `Limite do plano atingido: você tem ${current}/${limit} ${entityLabels[entity]}. ` +
        'Faça upgrade do plano para adicionar mais.'
    )
  }
}

/**
 * Obtém os limites do plano de uma organização
 */
export async function getPlanLimits(orgId: string): Promise<PlanLimits & { plan: PlanType }> {
  const plan = await getOrganizationPlan(orgId)
  return {
    ...PLAN_LIMITS[plan],
    plan,
  }
}
