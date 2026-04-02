import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { Plan } from '@prisma/client'
import { db } from '@/_lib/prisma'

// Mapeamento de entidade RBAC para feature key no catálogo
export type QuotaEntity = 'contact' | 'deal' | 'product' | 'member' | 'agent' | 'inbox' | 'follow_up_monthly' | 'follow_up' | 'automation' | 'agent_group' | 'pipeline'

// Slug do plano efetivo (usado pela UI)
export type PlanType = 'light' | 'essential' | 'scale' | 'enterprise'

const ENTITY_FEATURE_MAP: Record<QuotaEntity, string> = {
  contact: 'crm.max_contacts',
  deal: 'crm.max_deals',
  product: 'crm.max_products',
  member: 'crm.max_members',
  agent: 'ai.max_agents',
  inbox: 'inbox.max_inboxes',
  follow_up_monthly: 'ai.max_follow_up_monthly',
  follow_up: 'ai.max_follow_ups',
  automation: 'crm.max_automations',
  // Reutiliza o mesmo limite de agentes — na prática Light (max_agents=1) não consegue criar grupos
  agent_group: 'ai.max_agents',
  pipeline: 'crm.max_pipelines',
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
      // 1. Checar plan override (equipe interna / parceiros)
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { trialEndsAt: true, planOverride: true },
      })

      if (org?.planOverride) {
        return org.planOverride
      }

      // 2. Subscription ativa/trialing com planId
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

      // 3. Fallback para trial da org
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

// Tags de cache que cada entidade já usa nas suas actions de create/delete
const ENTITY_COUNT_TAGS: Record<QuotaEntity, (orgId: string) => string[]> = {
  contact: (orgId) => [`contacts:${orgId}`],
  deal: (orgId) => [`deals:${orgId}`],
  product: (orgId) => [`products:${orgId}`],
  member: (orgId) => [`org-members:${orgId}`],
  agent: (orgId) => [`agents:${orgId}`],
  inbox: (orgId) => [`inboxes:${orgId}`],
  follow_up_monthly: (orgId) => [`follow-up-monthly:${orgId}`],
  follow_up: (orgId) => [`follow-ups-org:${orgId}`],
  automation: (orgId) => [`automations:${orgId}`],
  agent_group: (orgId) => [`agentGroups:${orgId}`],
  pipeline: (orgId) => [`pipeline:${orgId}`],
}

/**
 * Conta registros existentes para uma entidade (Cacheado)
 * Revalida automaticamente quando a entidade é criada/deletada via tag compartilhada
 */
async function countRecords(orgId: string, entity: QuotaEntity): Promise<number> {
  const getCachedCount = unstable_cache(
    async () => {
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
        case 'agent':
          return db.agent.count({ where: { organizationId: orgId } })
        case 'inbox':
          return db.inbox.count({ where: { organizationId: orgId } })
        case 'follow_up_monthly': {
          // Contar mensagens de follow-up enviadas no mês corrente pela IA
          const now = new Date()
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          return db.message.count({
            where: {
              createdAt: { gte: firstDayOfMonth },
              metadata: { path: ['source'], equals: 'follow_up' },
              conversation: { organizationId: orgId },
            },
          })
        }
        case 'follow_up':
          return db.followUp.count({ where: { organizationId: orgId } })
        case 'automation':
          return db.automation.count({ where: { organizationId: orgId } })
        case 'agent_group':
          return db.agentGroup.count({ where: { organizationId: orgId } })
        case 'pipeline':
          return db.pipeline.count({ where: { organizationId: orgId } })
        default:
          return 0
      }
    },
    [`entity-count-${orgId}-${entity}`],
    {
      tags: ENTITY_COUNT_TAGS[entity](orgId),
      revalidate: 300,
    },
  )

  return getCachedCount()
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
 * Retorna o limite numérico de uma feature key arbitrária para a org.
 * Útil para limites que não se encaixam no padrão de quota por entidade
 * (ex: ai.max_workers_per_group — limite por grupo, não por org).
 * Retorna 0 se a org não tem plano ou a feature key não existe.
 */
export async function getFeatureLimit(orgId: string, featureKey: string): Promise<number> {
  const plan = await getEffectivePlan(orgId)
  if (!plan) return 0
  return getPlanLimit(plan.id, featureKey)
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
      agent: 'agentes IA',
      inbox: 'caixas de entrada',
      follow_up_monthly: 'follow-ups mensais',
      follow_up: 'follow-ups',
      automation: 'automações',
      agent_group: 'equipes de agentes',
      pipeline: 'funis de vendas',
    }

    throw new Error(
      `Limite do plano atingido: você tem ${current}/${limit} ${entityLabels[entity]}. ` +
        'Faça upgrade do plano para adicionar mais.',
    )
  }
}
