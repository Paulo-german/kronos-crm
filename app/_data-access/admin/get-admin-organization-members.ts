import 'server-only'
import { db } from '@/_lib/prisma'

export interface AdminMemberAcceptedDto {
  id: string
  userId: string | null
  email: string
  role: string
  status: string
  user: {
    fullName: string | null
    avatarUrl: string | null
  } | null
  joinedAt: Date
}

export interface AdminMemberPendingDto {
  id: string
  email: string
  role: string
  status: string
  invitedAt: Date
}

export const getAdminOrganizationMembers = async (organizationId: string) => {
  const [acceptedMembers, pendingMembers] = await Promise.all([
    db.member.findMany({
      where: { organizationId, status: 'ACCEPTED' },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.member.findMany({
      where: { organizationId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return {
    accepted: acceptedMembers.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.email,
      role: m.role,
      status: m.status,
      user: m.user,
      joinedAt: m.updatedAt,
    })),
    pending: pendingMembers.map((m) => ({
      id: m.id,
      email: m.email,
      role: m.role,
      status: m.status,
      invitedAt: m.createdAt,
    })),
  }
}
