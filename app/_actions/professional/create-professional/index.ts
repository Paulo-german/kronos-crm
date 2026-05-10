'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createProfessionalSchema } from './schema'
import { db } from '@/_lib/prisma'
import { randomUUID } from 'crypto'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resend } from '@/_lib/resend'

export const createProfessional = orgActionClient
  .schema(createProfessionalSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base para criar profissionais
    requirePermission(canPerformAction(ctx, 'professional', 'create'))

    // 2. Sem quota no v1 — ver §3.2 do plano

    // 3. Se userId fornecido, verificar que o User pertence à org via Member
    if (data.userId) {
      const member = await db.member.findFirst({
        where: { userId: data.userId, organizationId: ctx.orgId },
      })

      if (!member) {
        throw new Error('Usuário não encontrado ou não pertence à organização.')
      }

      // Garantir que não há outro profissional já vinculado a este userId na org
      const existingProfessional = await db.professional.findFirst({
        where: { userId: data.userId },
      })

      if (existingProfessional) {
        throw new Error('Este usuário já está vinculado a um profissional.')
      }
    }

    // 4. Criar o profissional
    const professional = await db.professional.create({
      data: {
        organizationId: ctx.orgId,
        userId: data.userId ?? null,
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        bio: data.bio ?? null,
        avatarUrl: data.avatarUrl ?? null,
      },
    })

    // 5. Vincular serviços ao profissional (se fornecidos)
    if (data.serviceIds && data.serviceIds.length > 0) {
      // Garantir que todos os serviceIds pertencem à org (prevenção de cross-org injection)
      const validServices = await db.service.findMany({
        where: { id: { in: data.serviceIds }, organizationId: ctx.orgId },
        select: { id: true },
      })

      if (validServices.length !== data.serviceIds.length) {
        throw new Error('Um ou mais serviços não pertencem à organização.')
      }

      await db.professionalService.createMany({
        data: data.serviceIds.map((serviceId) => ({
          organizationId: ctx.orgId,
          professionalId: professional.id,
          serviceId,
        })),
        skipDuplicates: true,
      })
    }

    // 6. Criar jornada inicial (apenas dias habilitados)
    if (data.workingHours) {
      const enabledDays = data.workingHours.filter((day) => day.enabled)
      if (enabledDays.length > 0) {
        await db.workingHours.createMany({
          data: enabledDays.map((day) => ({
            organizationId: ctx.orgId,
            professionalId: professional.id,
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
          })),
        })
      }
      revalidateTag(`working-hours:${professional.id}`)
    }

    // 7. Invalidar cache do profissional e dos serviços (vínculo mudou)
    revalidateTag(`professionals:${ctx.orgId}`)
    revalidateTag(`services:${ctx.orgId}`)

    // 8. Enviar convite por e-mail para profissionais sem userId vinculado
    if (!data.userId && data.email) {
      const inviteToken = randomUUID()
      const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)

      await db.professional.update({
        where: { id: professional.id },
        data: { inviteToken, inviteExpiresAt },
      })

      const organization = await db.organization.findUniqueOrThrow({
        where: { id: ctx.orgId },
        select: { name: true },
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL
      if (appUrl) {
        const inviteLink = `${appUrl}/invite/professional/${inviteToken}`
        try {
          await resend.emails.send({
            from: 'Kronos Hub <no-reply@kronoshub.com.br>',
            to: data.email,
            subject: `Você foi convidado para acessar a agenda de ${organization.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
                <h2 style="color: #111; margin-bottom: 16px;">Convite para profissional</h2>
                <p style="color: #333; font-size: 16px; line-height: 1.5;">
                  Olá, ${professional.name}! Você foi convidado para acessar a agenda da organização
                  <strong>${organization.name}</strong> no Kronos Hub.
                </p>
                <p style="margin: 24px 0;">
                  <a href="${inviteLink}" style="display: inline-block; background-color: #8257e5; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                    Aceitar convite
                  </a>
                </p>
                <p style="color: #666; font-size: 14px; line-height: 1.5;">
                  Este link expira em 72 horas. Se você não esperava este convite, pode ignorar este e-mail.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="color: #999; font-size: 12px;">Kronos Hub</p>
              </div>
            `,
          })
        } catch {
          // Token já salvo — admin pode reenviar pelo painel se o e-mail falhar
        }
      }
    }

    return { success: true, professionalId: professional.id }
  })
