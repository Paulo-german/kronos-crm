import 'server-only'
import { cache } from 'react'
import { checkPlanQuota, type QuotaEntity } from '@/_lib/rbac/plan-limits'

export interface QuotaInfo {
  current: number
  limit: number
  withinQuota: boolean
}

export interface QuotaSummary {
  contact: QuotaInfo
  deal: QuotaInfo
  product: QuotaInfo
  member: QuotaInfo
  follow_up: QuotaInfo
}

const ENTITIES: QuotaEntity[] = ['contact', 'deal', 'product', 'member', 'follow_up']

export const getAllQuotas = cache(async (orgId: string): Promise<QuotaSummary> => {
  const results = await Promise.all(
    ENTITIES.map((entity) => checkPlanQuota(orgId, entity)),
  )

  return {
    contact: results[0],
    deal: results[1],
    product: results[2],
    member: results[3],
    follow_up: results[4],
  }
})
