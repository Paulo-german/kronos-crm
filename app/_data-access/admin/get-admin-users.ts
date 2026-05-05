import 'server-only'
import { db } from '@/_lib/prisma'
import { supabaseAdmin } from '@/_lib/supabase/admin'
import type { AdminUserDto } from './types'

async function fetchAllAuthUsers() {
  const allUsers = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users.length) break
    allUsers.push(...data.users)
    if (data.users.length < perPage) break
    page++
  }

  return allUsers
}

export async function getAdminUsers(): Promise<AdminUserDto[]> {
  const [users, authUsers] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        phone: true,
        isSuperAdmin: true,
        isSupportAgent: true,
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
    }),
    fetchAllAuthUsers(),
  ])

  const confirmedAtMap = new Map(
    authUsers.map((authUser) => [
      authUser.id,
      authUser.email_confirmed_at ? new Date(authUser.email_confirmed_at) : null,
    ]),
  )

  return users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    isSuperAdmin: user.isSuperAdmin,
    isSupportAgent: user.isSupportAgent,
    emailVerifiedAt: confirmedAtMap.get(user.id) ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    organizations: user.memberships.map((member) => ({
      name: member.organization.name,
      slug: member.organization.slug,
      role: member.role,
    })),
  }))
}
