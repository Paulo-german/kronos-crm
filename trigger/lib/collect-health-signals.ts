import { db } from '@/_lib/prisma'
import type { LifecycleStage } from '@prisma/client'
import type { ContactSignalRow, ContactSignals } from './health-score-types'

// Converte uma linha raw da query para o shape tipado usado por computeHealthScore
export function toContactSignals(row: ContactSignalRow): ContactSignals {
  return {
    daysSinceLastInteraction: row.daysSinceLastInteraction,
    daysSinceLastDealActivity: row.daysSinceLastDealActivity,
    daysSinceLastPurchase: row.daysSinceLastPurchase,
    repurchaseCount12m: row.repurchaseCount12m,
    ltvBrl: row.ltvBrl,
    agentEngagementEventsLast30d: row.agentEngagementEventsLast30d,
  }
}

interface SignalQueryRow {
  contact_id: string
  lifecycle_stage: string
  days_since_interaction: number | null
  days_since_purchase: number | null
  purchases_12m: number
  ltv: number
  agent_events_30d: number
}

function mapRow(row: SignalQueryRow): ContactSignalRow {
  return {
    contactId: row.contact_id,
    lifecycleStage: row.lifecycle_stage as LifecycleStage,
    daysSinceLastInteraction: row.days_since_interaction,
    daysSinceLastDealActivity: null, // sem DealStageHistory no schema atual — MVP usa null
    daysSinceLastPurchase: row.days_since_purchase,
    repurchaseCount12m: Number(row.purchases_12m),
    ltvBrl: Number(row.ltv),
    agentEngagementEventsLast30d: Number(row.agent_events_30d),
  }
}

// Batch: retorna todos os contatos elegíveis da org (scoredAt IS NULL OR scoredAt < now() - 24h)
export async function collectSignalsForOrg(orgId: string): Promise<ContactSignalRow[]> {
  const rows = await db.$queryRaw<SignalQueryRow[]>`
    SELECT
      c.id                                                                    AS contact_id,
      c.lifecycle_stage                                                       AS lifecycle_stage,
      EXTRACT(days FROM now() - c.last_interaction_at)::int                   AS days_since_interaction,
      EXTRACT(days FROM now() - MAX(d.updated_at))::int                       AS days_since_purchase,
      COUNT(DISTINCT CASE
              WHEN d.updated_at >= now() - interval '12 months'
              THEN d.id
            END)::int                                                         AS purchases_12m,
      COALESCE(SUM(d.value + COALESCE(d.mrr * 12, 0)), 0)                    AS ltv,
      COUNT(DISTINCT ce.id)::int                                              AS agent_events_30d
    FROM contacts c
    LEFT JOIN conversations conv      ON conv.contact_id = c.id
    LEFT JOIN deal_contacts dc        ON dc.contact_id = c.id
    LEFT JOIN deals d                 ON d.id = dc.deal_id AND d.status = 'WON'
    LEFT JOIN conversation_events ce  ON ce.conversation_id = conv.id
                                     AND ce.created_at >= now() - interval '30 days'
    WHERE c.organization_id = ${orgId}
      AND (c.scored_at IS NULL OR c.scored_at < now() - interval '24 hours')
    GROUP BY c.id, c.lifecycle_stage, c.last_interaction_at
  `

  return rows.map(mapRow)
}

// Single: recalcula incondicionalmente um contato específico (usado pelo after() das actions)
export async function collectSignalsForContact(
  contactId: string,
  organizationId: string,
): Promise<ContactSignalRow | null> {
  const rows = await db.$queryRaw<SignalQueryRow[]>`
    SELECT
      c.id                                                                    AS contact_id,
      c.lifecycle_stage                                                       AS lifecycle_stage,
      EXTRACT(days FROM now() - c.last_interaction_at)::int                   AS days_since_interaction,
      EXTRACT(days FROM now() - MAX(d.updated_at))::int                       AS days_since_purchase,
      COUNT(DISTINCT CASE
              WHEN d.updated_at >= now() - interval '12 months'
              THEN d.id
            END)::int                                                         AS purchases_12m,
      COALESCE(SUM(d.value + COALESCE(d.mrr * 12, 0)), 0)                    AS ltv,
      COUNT(DISTINCT ce.id)::int                                              AS agent_events_30d
    FROM contacts c
    LEFT JOIN conversations conv      ON conv.contact_id = c.id
    LEFT JOIN deal_contacts dc        ON dc.contact_id = c.id
    LEFT JOIN deals d                 ON d.id = dc.deal_id AND d.status = 'WON'
    LEFT JOIN conversation_events ce  ON ce.conversation_id = conv.id
                                     AND ce.created_at >= now() - interval '30 days'
    WHERE c.id = ${contactId}
      AND c.organization_id = ${organizationId}
    GROUP BY c.id, c.lifecycle_stage, c.last_interaction_at
  `

  if (rows.length === 0) return null
  return mapRow(rows[0])
}
