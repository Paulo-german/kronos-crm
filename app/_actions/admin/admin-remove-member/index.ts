'use server'
import { superAdminActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { adminRemoveMemberSchema } from './schema'

export const adminRemoveMember = superAdminActionClient
  .schema(adminRemoveMemberSchema)
  .action(async ({ parsedInput: { organizationId, memberId, adminKey } }) => {
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
      throw new Error('O proprietário não pode ser removido. Delete a organização ou transfira a propriedade.')
    }

    await db.member.delete({ where: { id: memberId } })

    revalidateTag(`org-members:${organizationId}`)
    if (member.userId) {
      revalidateTag(`membership:${member.userId}:${member.organization.slug}`)
      revalidateTag(`user-orgs:${member.userId}`)
    }

    return { success: true }
  })
