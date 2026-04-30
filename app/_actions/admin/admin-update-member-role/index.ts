'use server'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { adminUpdateMemberRoleSchema } from './schema'

export const adminUpdateMemberRole = superAdminActionClient
  .schema(adminUpdateMemberRoleSchema)
  .action(async ({ parsedInput: { organizationId, memberId, role, adminKey } }) => {
    const superAdminKey = process.env.SUPER_ADMIN_KEY
    if (!superAdminKey || adminKey !== superAdminKey) {
      throw new Error('Senha incorreta.')
    }

    const member = await db.member.findFirst({
      where: { id: memberId, organizationId },
      select: {
        id: true,
        userId: true,
        role: true,
        organization: { select: { slug: true } },
      },
    })

    if (!member) throw new Error('Membro não encontrado.')
    if (member.role === 'OWNER') {
      throw new Error('Não é possível alterar o papel do proprietário.')
    }

    await db.member.update({ where: { id: memberId }, data: { role } })

    revalidateTag(`org-members:${organizationId}`)
    if (member.userId) {
      revalidateTag(`membership:${member.userId}:${member.organization.slug}`)
      revalidateTag(`user-orgs:${member.userId}`)
    }

    return { success: true }
  })
