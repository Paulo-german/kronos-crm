import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { CaptureChannel, Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { SIMULATOR_CONTACT_PHONE } from '@/_lib/simulator'
import { getPreviousPeriod } from '@/_utils/date-range'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { DateRange, ReportsFilters } from '../shared/reports-types'

const CACHE_REVALIDATE_SECONDS = 3600

export type AttributionModel = 'first' | 'last' | 'per_deal'

export interface ChannelAttributionRow {
  channel: string
  leadsCount: number
  customersCount: number
  conversionRate: number
  revenue: number
  prevLeadsCount: number
  prevCustomersCount: number
  prevConversionRate: number
  prevRevenue: number
}

export interface ChannelAttributionDto {
  model: AttributionModel
  rows: ChannelAttributionRow[]
  totalLeads: number
  totalCustomers: number
  totalRevenue: number
}

interface PeriodAggregate {
  leadsByChannel: Map<CaptureChannel, number>
  customersByChannel: Map<CaptureChannel, number>
  revenueByChannel: Map<CaptureChannel, number>
}

const PERCENT_BASE = 100

function emptyAggregate(): PeriodAggregate {
  return {
    leadsByChannel: new Map(),
    customersByChannel: new Map(),
    revenueByChannel: new Map(),
  }
}

function incrementMap<K>(map: Map<K, number>, key: K, delta: number) {
  map.set(key, (map.get(key) ?? 0) + delta)
}

// Resolve o assignedTo efetivo seguindo a mesma semântica de buildReportsWhere:
// MEMBER (não elevado) vê apenas os próprios registros; elevado pode filtrar por membro.
function resolveAssigneeFilter(
  userId: string,
  elevated: boolean,
  filters: ReportsFilters,
): string | undefined {
  if (!elevated) return userId
  return filters.assignee
}

// Agrupa por canal capturado no Contact (firstCaptureChannel ou lastCaptureChannel).
// Clientes = contatos com pelo menos um Deal WON; Receita = soma dos values desses Deals WON.
async function aggregateContactModel(
  orgId: string,
  userId: string,
  elevated: boolean,
  range: DateRange,
  channelField: 'firstCaptureChannel' | 'lastCaptureChannel',
  dateField: 'firstCaptureAt' | 'lastCaptureAt',
  includeManual: boolean,
  filters: ReportsFilters,
): Promise<PeriodAggregate> {
  const assigneeFilter = resolveAssigneeFilter(userId, elevated, filters)
  const baseWhere: Prisma.ContactWhereInput = {
    organizationId: orgId,
    phone: { not: SIMULATOR_CONTACT_PHONE },
    [channelField]: { not: null },
    [dateField]: { gte: range.start, lte: range.end },
    ...(assigneeFilter ? { assignedTo: assigneeFilter } : {}),
    // includeManual = false → apenas contatos cujo evento de captura foi automático
    ...(includeManual
      ? {}
      : {
          captureEvents: {
            some: { capturedAutomatically: true },
          },
        }),
  }

  const contacts = await db.contact.findMany({
    where: baseWhere,
    select: {
      id: true,
      firstCaptureChannel: true,
      lastCaptureChannel: true,
      // Filtramos os deals WON no próprio banco (mesmo escopo de org/assignee
      // que era aplicado em memória) em vez de trazer TODOS os deals de cada
      // contato e descartar a maioria — evita over-fetch em orgs grandes.
      deals: {
        where: {
          deal: {
            status: 'WON',
            organizationId: orgId,
            ...(assigneeFilter ? { assignedTo: assigneeFilter } : {}),
          },
        },
        select: {
          deal: { select: { value: true } },
        },
      },
    },
  })

  const aggregate = emptyAggregate()

  for (const contact of contacts) {
    const channel = contact[channelField]
    if (!channel) continue

    incrementMap(aggregate.leadsByChannel, channel, 1)

    // `contact.deals` já vem filtrado para WON no escopo correto.
    const wonDeals = contact.deals

    if (wonDeals.length > 0) {
      incrementMap(aggregate.customersByChannel, channel, 1)
      const revenue = wonDeals.reduce(
        (sum, dealLink) => sum + Number(dealLink.deal.value),
        0,
      )
      incrementMap(aggregate.revenueByChannel, channel, revenue)
    }
  }

  return aggregate
}

// Modelo per_deal: cada Deal × CaptureEvent PRIMARY contribui para o canal do evento.
// Leads = contatos únicos por canal (a partir dos eventos PRIMARY no período).
async function aggregatePerDealModel(
  orgId: string,
  userId: string,
  elevated: boolean,
  range: DateRange,
  includeManual: boolean,
  filters: ReportsFilters,
): Promise<PeriodAggregate> {
  const assigneeFilter = resolveAssigneeFilter(userId, elevated, filters)
  const events = await db.dealCaptureEvent.findMany({
    where: {
      attribution: 'PRIMARY',
      removedAt: null,
      deal: {
        organizationId: orgId,
        contacts: { none: { contact: { phone: SIMULATOR_CONTACT_PHONE } } },
        ...(assigneeFilter ? { assignedTo: assigneeFilter } : {}),
        createdAt: { gte: range.start, lte: range.end },
      },
      captureEvent: {
        ...(includeManual ? {} : { capturedAutomatically: true }),
      },
    },
    select: {
      deal: {
        select: {
          id: true,
          status: true,
          value: true,
          contacts: { select: { contactId: true } },
        },
      },
      captureEvent: { select: { channel: true } },
    },
  })

  const aggregate = emptyAggregate()
  const leadsSeen = new Map<CaptureChannel, Set<string>>()
  // Clientes únicos por canal: um contato com vários deals WON no mesmo canal conta uma vez só
  const customersSeen = new Map<CaptureChannel, Set<string>>()

  for (const event of events) {
    const channel = event.captureEvent.channel
    const deal = event.deal

    // Leads únicos por canal: usamos contactIds do deal para evitar dupla contagem
    const contactIds = deal.contacts.map((dealContact) => dealContact.contactId)
    if (!leadsSeen.has(channel)) leadsSeen.set(channel, new Set())
    const leadSet = leadsSeen.get(channel)
    if (leadSet) {
      for (const contactId of contactIds) leadSet.add(contactId)
    }

    if (deal.status === 'WON') {
      if (!customersSeen.has(channel)) customersSeen.set(channel, new Set())
      const customerSet = customersSeen.get(channel)
      if (customerSet) {
        // Só conta como novo cliente na primeira vez que o contactId aparece no canal
        for (const contactId of contactIds) {
          if (!customerSet.has(contactId)) {
            customerSet.add(contactId)
            incrementMap(aggregate.customersByChannel, channel, 1)
          }
        }
      }
      incrementMap(aggregate.revenueByChannel, channel, Number(deal.value))
    }
  }

  for (const [channel, set] of leadsSeen.entries()) {
    aggregate.leadsByChannel.set(channel, set.size)
  }

  return aggregate
}

async function fetchChannelAttribution(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  prevRange: DateRange,
  model: AttributionModel,
  includeManual: boolean,
  filters: ReportsFilters,
): Promise<ChannelAttributionDto> {
  const [current, previous] = await Promise.all([
    model === 'per_deal'
      ? aggregatePerDealModel(
          orgId,
          userId,
          elevated,
          dateRange,
          includeManual,
          filters,
        )
      : aggregateContactModel(
          orgId,
          userId,
          elevated,
          dateRange,
          model === 'first' ? 'firstCaptureChannel' : 'lastCaptureChannel',
          model === 'first' ? 'firstCaptureAt' : 'lastCaptureAt',
          includeManual,
          filters,
        ),
    model === 'per_deal'
      ? aggregatePerDealModel(
          orgId,
          userId,
          elevated,
          prevRange,
          includeManual,
          filters,
        )
      : aggregateContactModel(
          orgId,
          userId,
          elevated,
          prevRange,
          model === 'first' ? 'firstCaptureChannel' : 'lastCaptureChannel',
          model === 'first' ? 'firstCaptureAt' : 'lastCaptureAt',
          includeManual,
          filters,
        ),
  ])

  const channels = new Set<CaptureChannel>([
    ...current.leadsByChannel.keys(),
    ...previous.leadsByChannel.keys(),
  ])

  const rows: ChannelAttributionRow[] = Array.from(channels).map((channel) => {
    const leadsCount = current.leadsByChannel.get(channel) ?? 0
    const customersCount = current.customersByChannel.get(channel) ?? 0
    const revenue = current.revenueByChannel.get(channel) ?? 0
    const prevLeadsCount = previous.leadsByChannel.get(channel) ?? 0
    const prevCustomersCount = previous.customersByChannel.get(channel) ?? 0
    const prevRevenue = previous.revenueByChannel.get(channel) ?? 0

    const conversionRate =
      leadsCount > 0 ? (customersCount / leadsCount) * PERCENT_BASE : 0
    const prevConversionRate =
      prevLeadsCount > 0
        ? (prevCustomersCount / prevLeadsCount) * PERCENT_BASE
        : 0

    return {
      channel,
      leadsCount,
      customersCount,
      conversionRate,
      revenue,
      prevLeadsCount,
      prevCustomersCount,
      prevConversionRate,
      prevRevenue,
    }
  })

  // Ordena por receita desc — canais com mais retorno aparecem primeiro na tabela
  rows.sort((rowA, rowB) => rowB.revenue - rowA.revenue)

  const totalLeads = rows.reduce((sum, row) => sum + row.leadsCount, 0)
  const totalCustomers = rows.reduce((sum, row) => sum + row.customersCount, 0)
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0)

  return { model, rows, totalLeads, totalCustomers, totalRevenue }
}

export const getChannelAttribution = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    options: { model: AttributionModel; includeManual: boolean },
    filters: ReportsFilters,
  ): Promise<ChannelAttributionDto> => {
    const elevated = isElevated(ctx.userRole)
    const prevRange = getPreviousPeriod(dateRange)

    const getCached = unstable_cache(
      async () =>
        fetchChannelAttribution(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          prevRange,
          options.model,
          options.includeManual,
          filters,
        ),
      // Inclui filters na chave de cache para isolar resultados por assignee/filtros
      makeReportsCacheKey('channel-attribution', ctx, dateRange, {
        ...options,
        ...filters,
      }),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
