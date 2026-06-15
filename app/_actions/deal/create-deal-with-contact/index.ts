'use server'

import { after } from 'next/server'
import { orgActionClient } from '@/_lib/safe-action'
import { createDealWithContactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  canPerformAction,
  requirePermission,
  requireQuota,
  resolveAssignedTo,
} from '@/_lib/rbac'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import { toE164 } from '@/_utils/to-e164'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'
import { advanceContactLifecycle } from '@/_lib/lifecycle/advance-contact-lifecycle'
import { ensureDealHasPrimaryCaptureEvent } from '@/_lib/lifecycle/ensure-deal-capture-event'
import { createContactPrivacy } from '@/_lib/privacy/create-contact-privacy'
import { LifecycleCauseType, LifecycleStage } from '@prisma/client'

export const createDealWithContact = orgActionClient
  .schema(createDealWithContactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base para criar deals
    requirePermission(canPerformAction(ctx, 'deal', 'create'))

    // 2. Verificar quota de deals do plano
    await requireQuota(ctx.orgId, 'deal')

    // Quota dupla: quando cria contato inline, verificar limite de contatos
    // ANTES de qualquer escrita no banco para não deixar estado inconsistente
    if (data.contactMode === 'new') {
      await requireQuota(ctx.orgId, 'contact')
    }

    // 3. Resolver assignedTo (MEMBER = forçado para si mesmo)
    const assignedTo = resolveAssignedTo(ctx, data.assignedTo)

    // 4. Validações cross-entity: todos os IDs recebidos do client precisam ser
    // verificados contra orgId para garantir que pertencem à mesma organização

    // 4.1 Validar que a stage pertence a um pipeline desta org
    const stage = await db.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        pipeline: {
          organizationId: ctx.orgId,
        },
      },
    })

    if (!stage) {
      throw new Error('Etapa não encontrada.')
    }

    // 4.2 Validar contato existente e buscar role para o DealContact
    let existingContactRole = ''

    if (data.contactMode === 'existing' && data.contactId) {
      const contact = await db.contact.findFirst({
        where: {
          id: data.contactId,
          organizationId: ctx.orgId,
        },
      })

      if (!contact) {
        throw new Error('Contato não encontrado.')
      }

      existingContactRole = contact.role ?? ''
    }

    // 4.3 Validar empresa, se informada
    if (data.companyId) {
      const company = await db.company.findFirst({
        where: {
          id: data.companyId,
          organizationId: ctx.orgId,
        },
      })

      if (!company) {
        throw new Error('Empresa não encontrada.')
      }
    }

    // 5. Operação no banco
    let deal: { id: string }
    let newContactId: string | null = null

    if (data.contactMode === 'new') {
      // Transação atômica: se qualquer operação falhar, NADA é persistido
      const result = await db.$transaction(async (tx) => {
        const newContact = await tx.contact.create({
          data: {
            organizationId: ctx.orgId,
            assignedTo,
            name: data.contactName,
            email: data.contactEmail || null,
            phone: toE164(data.contactPhone),
            isDecisionMaker: false,
          },
        })

        // Operador criou o contato junto com o deal → legítimo interesse / criação manual
        await createContactPrivacy(tx, {
          contactId: newContact.id,
          legalBasis: 'LEGITIMATE_INTEREST',
          legalBasisSource: 'MANUAL_CREATION',
          performedBy: ctx.userId,
        })

        const newDeal = await tx.deal.create({
          data: {
            organizationId: ctx.orgId,
            title: data.title,
            pipelineStageId: data.stageId,
            companyId: data.companyId || null,
            assignedTo,
            ...(data.priority ? { priority: data.priority } : {}),
            ...(data.notes ? { notes: data.notes } : {}),
            contacts: {
              create: {
                contactId: newContact.id,
                isPrimary: true,
                role: '',
              },
            },
          },
        })

        return { deal: newDeal, contactId: newContact.id }
      })

      deal = result.deal
      newContactId = result.contactId
    } else {
      // Modo "existing": cria deal com ou sem contato, igual ao createDeal original
      deal = await db.deal.create({
        data: {
          organizationId: ctx.orgId,
          title: data.title,
          pipelineStageId: data.stageId,
          companyId: data.companyId || null,
          assignedTo,
          ...(data.priority ? { priority: data.priority } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
          contacts: data.contactId
            ? {
                create: {
                  contactId: data.contactId,
                  isPrimary: true,
                  role: existingContactRole,
                },
              }
            : undefined,
        },
      })
    }

    // 6. Invalidar cache
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)

    // Contato recém-criado invalida a lista de contatos para o combobox e a página
    if (data.contactMode === 'new' && newContactId) {
      revalidateTag(`contacts:${ctx.orgId}`)
      revalidateTag(`privacy:${newContactId}`)
    }

    // Notificar responsável quando o deal é atribuído a outro usuário
    if (assignedTo !== ctx.userId) {
      after(async () => {
        const slug = await getOrgSlug(ctx.orgId)
        await createNotification({
          orgId: ctx.orgId,
          userId: assignedTo,
          type: 'USER_ACTION',
          title: 'Novo deal atribuído a você',
          body: `O deal "${data.title}" foi atribuído a você.`,
          actionUrl: `/org/${slug}/crm/deals/${deal.id}`,
          resourceType: 'deal',
          resourceId: deal.id,
        })
      })
    }

    // Automações rodam depois da resposta mas dentro do contexto do request,
    // para que revalidateTag/revalidatePath dos executores funcionem corretamente
    after(() =>
      evaluateAutomations({
        subjectKind: 'deal',
        orgId: ctx.orgId,
        triggerType: 'DEAL_CREATED',
        dealId: deal.id,
        payload: {
          stageId: data.stageId,
          pipelineId: stage.pipelineId,
          assignedTo,
        },
      }),
    )

    // Dispara CONTACT_CREATED para o contato criado inline — o contato é novo
    // e deve participar do motor de automações como qualquer outro contato criado
    if (newContactId) {
      after(() =>
        evaluateAutomations({
          subjectKind: 'contact',
          orgId: ctx.orgId,
          triggerType: 'CONTACT_CREATED',
          contactId: newContactId,
          payload: { lifecycleStage: 'LEAD', assignedTo },
        }),
      )
    }

    after(async () => {
      const org = await db.organization.findUnique({
        where: { id: ctx.orgId },
        select: { facilitatorDealCreatedToOppty: true },
      })

      if (!org?.facilitatorDealCreatedToOppty) return

      const primaryContact = await db.dealContact.findFirst({
        where: { dealId: deal.id, isPrimary: true },
        select: { contactId: true },
      })

      if (!primaryContact) return

      await ensureDealHasPrimaryCaptureEvent({
        dealId: deal.id,
        organizationId: ctx.orgId,
      })
      await advanceContactLifecycle({
        contactId: primaryContact.contactId,
        organizationId: ctx.orgId,
        toStage: LifecycleStage.OPPORTUNITY,
        causeType: LifecycleCauseType.DEAL_CREATED,
        causeRefId: deal.id,
      })
    })

    return { success: true, dealId: deal.id }
  })
