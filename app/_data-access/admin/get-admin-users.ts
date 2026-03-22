import 'server-only'
import { db } from '@/_lib/prisma'
import type { AdminUserDto } from './types'

export async function getAdminUsers(): Promise<AdminUserDto[]> {
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
      phone: true,
      isSuperAdmin: true,
      createdAt: true,
      updatedAt: true,
      memberships: {
        where: { status: 'ACCEPTED' },
        select: {
          role: true,
          organization: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  })

  return users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    isSuperAdmin: user.isSuperAdmin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    organizations: user.memberships.map((member) => ({
      name: member.organization.name,
      slug: member.organization.slug,
      role: member.role,
    })),
  }))
}
