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
    accepted: acceptedMembers.map((member) => ({
      id: member.id,
      userId: member.userId,
      email: member.email,
      role: member.role,
      status: member.status,
      user: member.user,
      joinedAt: member.updatedAt,
    })),
    pending: pendingMembers.map((member) => ({
      id: member.id,
      email: member.email,
      role: member.role,
      status: member.status,
      invitedAt: member.createdAt,
    })),
  }
}
