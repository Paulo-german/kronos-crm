'use server'

import { authActionClient } from '@/_lib/safe-action'
import { acceptProfessionalInviteSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'

export const acceptProfessionalInvite = authActionClient
  .schema(acceptProfessionalInviteSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Buscar professional pelo token
    const professional = await db.professional.findFirst({
      where: { inviteToken: data.token },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        inviteExpiresAt: true,
        organization: { select: { slug: true } },
      },
    })

    if (!professional) {
      throw new Error('Convite inválido ou não encontrado.')
    }

    // 2. Verificar expiração
    if (!professional.inviteExpiresAt || professional.inviteExpiresAt < new Date()) {
      throw new Error('Este convite expirou. Solicite um novo ao administrador.')
    }

    // 3. Garantir que o convite ainda não foi aceito (userId deve ser null)
    if (professional.userId !== null) {
      throw new Error('Este convite já foi utilizado.')
    }

    // 4. Vincular userId e limpar token
    await db.professional.update({
      where: { id: professional.id },
      data: {
        userId: ctx.userId,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    })

    // 5. Invalidar caches relevantes
    revalidateTag(`professional:${professional.id}`)
    revalidateTag(`professionals:${professional.organizationId}`)

    return {
      success: true,
      organizationId: professional.organizationId,
      professionalId: professional.id,
      orgSlug: professional.organization.slug,
    }
  })
