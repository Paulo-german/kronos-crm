import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { CaptureChannel, Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { SIMULATOR_CONTACT_PHONE } from '@/_lib/simulator'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { DateRange } from '../shared/reports-types'
import type { AttributionModel } from './get-channel-attribution'

const CACHE_REVALIDATE_SECONDS = 3600

export interface ChannelAttributionDrillRow {
  contactId: string
  contactName: string
  firstCaptureAt: Date | null
  lastCaptureAt: Date | null
  hasWonDeal: boolean
  totalRevenue: number
}

interface DrillOptions {
  channel: string
  model: AttributionModel
  page: number
  pageSize: number
}

const VALID_CHANNELS: ReadonlyArray<CaptureChannel> = [
  'WHATSAPP',
  'INSTAGRAM',
  'WEBSITE_CHAT',
  'EMBED_FORM',
  'FACEBOOK_LEAD',
  'API',
  'PHONE_CALL',
  'IN_PERSON',
  'EVENT',
  'EMAIL',
  'REFERRAL',
  'IMPORT',
  'UNKNOWN',
]

function isCaptureChannel(value: string): value is CaptureChannel {
  return VALID_CHANNELS.includes(value as CaptureChannel)
}

function buildContactWhere(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  channel: CaptureChannel,
  model: AttributionModel,
): Prisma.ContactWhereInput {
  // first/last derivam direto de campos no Contact; per_deal exige join via captureEvents.deals
  if (model === 'first') {
    return {
      organizationId: orgId,
      phone: { not: SIMULATOR_CONTACT_PHONE },
      firstCaptureChannel: channel,
      firstCaptureAt: { gte: dateRange.start, lte: dateRange.end },
      ...(elevated ? {} : { assignedTo: userId }),
    }
  }

  if (model === 'last') {
    return {
      organizationId: orgId,
      phone: { not: SIMULATOR_CONTACT_PHONE },
      lastCaptureChannel: channel,
      lastCaptureAt: { gte: dateRange.start, lte: dateRange.end },
      ...(elevated ? {} : { assignedTo: userId }),
    }
  }

  // model === 'per_deal' — contatos com pelo menos um DealCaptureEvent PRIMARY no canal/período
  return {
    organizationId: orgId,
    phone: { not: SIMULATOR_CONTACT_PHONE },
    ...(elevated ? {} : { assignedTo: userId }),
    deals: {
      some: {
        deal: {
          organizationId: orgId,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          ...(elevated ? {} : { assignedTo: userId }),
          captureEvents: {
            some: {
              attribution: 'PRIMARY',
              removedAt: null,
              captureEvent: { channel },
            },
          },
        },
      },
    },
  }
}

async function fetchChannelAttributionRows(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  options: DrillOptions,
): Promise<{ rows: ChannelAttributionDrillRow[]; total: number }> {
  if (!isCaptureChannel(options.channel)) {
    return { rows: [], total: 0 }
  }

  const where = buildContactWhere(
    orgId,
    userId,
    elevated,
    dateRange,
    options.channel,
    options.model,
  )

  const skip = Math.max(0, (options.page - 1) * options.pageSize)

  const [contacts, total] = await Promise.all([
    db.contact.findMany({
      where,
      skip,
      take: options.pageSize,
      orderBy: { lastCaptureAt: 'desc' },
      select: {
        id: true,
        name: true,
        firstCaptureAt: true,
        lastCaptureAt: true,
        deals: {
          select: {
            deal: {
              select: {
                status: true,
                value: true,
                organizationId: true,
                assignedTo: true,
              },
            },
          },
        },
      },
    }),
    db.contact.count({ where }),
  ])

  const rows: ChannelAttributionDrillRow[] = contacts.map((contact) => {
    const wonDeals = contact.deals.filter((dealLink) => {
      const deal = dealLink.deal
      if (deal.status !== 'WON') return false
      if (deal.organizationId !== orgId) return false
      if (!elevated && deal.assignedTo !== userId) return false
      return true
    })

    const totalRevenue = wonDeals.reduce(
      (sum, dealLink) => sum + Number(dealLink.deal.value),
      0,
    )

    return {
      contactId: contact.id,
      contactName: contact.name,
      firstCaptureAt: contact.firstCaptureAt,
      lastCaptureAt: contact.lastCaptureAt,
      hasWonDeal: wonDeals.length > 0,
      totalRevenue,
    }
  })

  return { rows, total }
}

export const getChannelAttributionRows = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    options: DrillOptions,
  ): Promise<{ rows: ChannelAttributionDrillRow[]; total: number }> => {
    const elevated = isElevated(ctx.userRole)

    const getCached = unstable_cache(
      async () =>
        fetchChannelAttributionRows(ctx.orgId, ctx.userId, elevated, dateRange, options),
      makeReportsCacheKey('channel-attribution-rows', ctx, dateRange, { ...options }),
      {
        tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
