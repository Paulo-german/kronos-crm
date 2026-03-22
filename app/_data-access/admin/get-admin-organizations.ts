import 'server-only'
import { db } from '@/_lib/prisma'
import type { AdminOrganizationDto } from './types'

export async function getAdminOrganizations(): Promise<AdminOrganizationDto[]> {
  const organizations = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      trialEndsAt: true,
      createdAt: true,
      _count: {
        select: {
          members: { where: { status: 'ACCEPTED' } },
        },
      },
      subscriptions: {
        where: { status: { in: ['active', 'trialing', 'past_due'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          plan: {
            select: { name: true },
          },
        },
      },
    },
  })

  return organizations.map((org) => {
    const subscription = org.subscriptions[0] ?? null

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      memberCount: org._count.members,
      subscription: subscription
        ? {
            status: subscription.status,
            planName: subscription.plan?.name ?? 'Desconhecido',
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
      trialEndsAt: org.trialEndsAt,
      createdAt: org.createdAt,
    }
  })
}
