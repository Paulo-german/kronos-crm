'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createDealWithContactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  canPerformAction,
  requirePermission,
  requireQuota,
  resolveAssignedTo,
} from '@/_lib/rbac'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'

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

    if (data.contactMode === 'new') {
      // Transação atômica: se qualquer operação falhar, NADA é persistido
      deal = await db.$transaction(async (tx) => {
        const newContact = await tx.contact.create({
          data: {
            organizationId: ctx.orgId,
            assignedTo,
            name: data.contactName,
            email: data.contactEmail || null,
            phone: data.contactPhone || null,
            isDecisionMaker: false,
          },
        })

        return tx.deal.create({
          data: {
            organizationId: ctx.orgId,
            title: data.title,
            pipelineStageId: data.stageId,
            companyId: data.companyId || null,
            expectedCloseDate: data.expectedCloseDate || null,
            assignedTo,
            contacts: {
              create: {
                contactId: newContact.id,
                isPrimary: true,
                role: '',
              },
            },
          },
        })
      })
    } else {
      // Modo "existing": cria deal com ou sem contato, igual ao createDeal original
      deal = await db.deal.create({
        data: {
          organizationId: ctx.orgId,
          title: data.title,
          pipelineStageId: data.stageId,
          companyId: data.companyId || null,
          expectedCloseDate: data.expectedCloseDate || null,
          assignedTo,
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
    revalidatePath('/crm/deals/pipeline')
    revalidatePath('/crm/deals/list')
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)

    // Contato recém-criado invalida a lista de contatos para o combobox e a página
    if (data.contactMode === 'new') {
      revalidateTag(`contacts:${ctx.orgId}`)
    }

    // Notificar responsável quando o deal é atribuído a outro usuário (fire-and-forget)
    if (assignedTo !== ctx.userId) {
      void getOrgSlug(ctx.orgId).then((slug) => {
        void createNotification({
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

    // Fire-and-forget: automações não bloqueiam a resposta da action
    void evaluateAutomations({
      orgId: ctx.orgId,
      triggerType: 'DEAL_CREATED',
      dealId: deal.id,
      payload: {
        stageId: data.stageId,
        pipelineId: stage.pipelineId,
        assignedTo,
      },
    })

    return { success: true, dealId: deal.id }
  })
