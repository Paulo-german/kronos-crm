'use server'

import {
  CaptureChannel,
  CustomerStatus,
  DealStatus,
  LifecycleCauseType,
  LifecycleStage,
  Prisma,
} from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { contactSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { after } from 'next/server'
import {
  canPerformAction,
  requirePermission,
  resolveAssignedTo,
  requireQuota,
} from '@/_lib/rbac'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'
import { createContactPrivacy } from '@/_lib/privacy/create-contact-privacy'
import { resolveLegalBasisForChannel } from '@/_lib/privacy/legal-basis-map'
import { normalizeEmail } from '@/_lib/contact/normalize-email'
import { toE164 } from '@/_utils/to-e164'

export const createContact = orgActionClient
  .schema(contactSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base para criar contatos
    requirePermission(canPerformAction(ctx, 'contact', 'create'))

    // 2. Verificar quota do plano
    await requireQuota(ctx.orgId, 'contact')

    // 3. Resolver assignedTo (MEMBER = forçado para si mesmo)
    const assignedTo = resolveAssignedTo(ctx, data.assignedTo)

    // 4. Se tem empresa, verifica se pertence à organização
    if (data.companyId) {
      const company = await db.company.findFirst({
        where: {
          id: data.companyId,
          organizationId: ctx.orgId,
        },
      })

      if (!company) {
        throw new Error('Empresa não encontrada ou não pertence à organização.')
      }
    }

    const initialStage = data.lifecycleStage ?? LifecycleStage.LEAD
    const needsInlineDeal =
      initialStage === LifecycleStage.OPPORTUNITY ||
      initialStage === LifecycleStage.CUSTOMER
    const now = new Date()

    // Timestamps de todos os estágios percorridos até initialStage — garante integridade
    // para dashboard e relatórios que consultam becameOpportunityAt / becameCustomerAt etc.
    const stageFields =
      initialStage === LifecycleStage.QUALIFIED
        ? { qualifiedAt: now }
        : initialStage === LifecycleStage.OPPORTUNITY
          ? { qualifiedAt: now, becameOpportunityAt: now }
          : initialStage === LifecycleStage.CUSTOMER
            ? {
                qualifiedAt: now,
                becameOpportunityAt: now,
                becameCustomerAt: now,
                customerStatus: CustomerStatus.ACTIVE,
              }
            : {}

    // Cadeia de histórico: um registro por estágio percorrido — analytics conta cada transição.
    // COLD é entrada fria isolada (lista importada): não percorre o funil quente LEAD→…,
    // gera um único registro (null → COLD). Os demais estágios fazem backfill a partir de LEAD.
    const warmChain: LifecycleStage[] = [
      LifecycleStage.LEAD,
      LifecycleStage.QUALIFIED,
      LifecycleStage.OPPORTUNITY,
      LifecycleStage.CUSTOMER,
    ]
    const historyStages =
      initialStage === LifecycleStage.COLD
        ? [LifecycleStage.COLD]
        : warmChain.slice(0, warmChain.indexOf(initialStage) + 1)
    const historyChain = historyStages.map((stage, index, arr) => ({
        organizationId: ctx.orgId,
        fromStage: index === 0 ? null : arr[index - 1],
        toStage: stage,
        causeType: LifecycleCauseType.CONTACT_CREATED,
        causeRefId: null as string | null,
        changedByUserId: ctx.userId,
      }))

    // Canal de captura: padrão UNKNOWN quando não informado
    const captureChannel = data.firstCaptureChannel ?? CaptureChannel.UNKNOWN

    // Validar que a etapa do pipeline pertence à organização
    if (
      needsInlineDeal &&
      data.inlineDealTitle?.trim() &&
      data.inlineDealPipelineStageId
    ) {
      const stageExists = await db.pipelineStage.findFirst({
        where: {
          id: data.inlineDealPipelineStageId,
          pipeline: { organizationId: ctx.orgId },
        },
        select: { id: true },
      })

      if (!stageExists) {
        throw new Error('Etapa do pipeline não encontrada.')
      }
    }

    // Aviso não-bloqueante: telefone não tem unicidade (diferente do email).
    // Detecta duplicata para alertar o operador, mas permite criar.
    const normalizedPhone = toE164(data.phone)
    const phoneAlreadyUsed = normalizedPhone
      ? Boolean(
          await db.contact.findFirst({
            where: { organizationId: ctx.orgId, phone: normalizedPhone },
            select: { id: true },
          }),
        )
      : false

    // Telefone não tem unicidade (diferente do email): se já existe e o operador
    // ainda não confirmou, devolve sem criar para o front pedir confirmação.
    if (phoneAlreadyUsed && !data.confirmDuplicatePhone) {
      return {
        success: false,
        needsPhoneConfirmation: true,
        contactId: null,
        dealId: null,
        current: null,
        limit: null,
      }
    }

    try {
      const txResult = await db.$transaction(async (tx) => {
        const newContact = await tx.contact.create({
          data: {
            organizationId: ctx.orgId,
            assignedTo,
            name: data.name,
            email: normalizeEmail(data.email),
            phone: normalizedPhone,
            role: data.role || null,
            companyId: data.companyId || null,
            isDecisionMaker: data.isDecisionMaker,
            lifecycleStage: initialStage,
            ...stageFields,
            firstCaptureChannel: captureChannel,
            firstCaptureAt: now,
            lastCaptureChannel: captureChannel,
            lastCaptureAt: now,
          },
        })

        await tx.contactLifecycleHistory.createMany({
          data: historyChain.map((record) => ({
            ...record,
            contactId: newContact.id,
          })),
        })

        // legalBasis: usa o selecionado no form se fornecido, senão deriva do canal
        await createContactPrivacy(tx, {
          contactId: newContact.id,
          legalBasis:
            data.legalBasis ??
            resolveLegalBasisForChannel(captureChannel).legalBasis,
          legalBasisSource: 'MANUAL_CREATION',
          performedBy: ctx.userId,
        })

        // Criar negociação inline para OPPORTUNITY e CUSTOMER
        let inlineDealId: string | null = null
        if (
          needsInlineDeal &&
          data.inlineDealTitle?.trim() &&
          data.inlineDealPipelineStageId
        ) {
          const deal = await tx.deal.create({
            data: {
              organizationId: ctx.orgId,
              assignedTo,
              title: data.inlineDealTitle.trim(),
              pipelineStageId: data.inlineDealPipelineStageId,
              companyId: data.companyId || null,
              status:
                initialStage === LifecycleStage.CUSTOMER
                  ? DealStatus.WON
                  : DealStatus.OPEN,
            },
          })

          await tx.dealContact.create({
            data: {
              dealId: deal.id,
              contactId: newContact.id,
              isPrimary: true,
            },
          })

          inlineDealId = deal.id
        }

        return { contact: newContact, dealId: inlineDealId }
      })

      revalidateTag(`contacts:${ctx.orgId}`)
      revalidateTag(`privacy:${txResult.contact.id}`)

      if (txResult.dealId) {
        revalidateTag(`pipeline:${ctx.orgId}`)
        revalidateTag(`deals:${ctx.orgId}`)
        revalidateTag(`deals-options:${ctx.orgId}`)
        revalidateTag(`dashboard:${ctx.orgId}`)
      }

      // Automações de CONTACT_CREATED rodam após a resposta, mas dentro do contexto
      // do request, para que revalidateTag/revalidatePath dos executores funcionem.
      after(() =>
        evaluateAutomations({
          subjectKind: 'contact',
          orgId: ctx.orgId,
          triggerType: 'CONTACT_CREATED',
          contactId: txResult.contact.id,
          payload: {
            lifecycleStage: txResult.contact.lifecycleStage,
            assignedTo: txResult.contact.assignedTo,
            source: txResult.contact.firstCaptureChannel,
          },
        }),
      )

      const quota = await checkPlanQuota(ctx.orgId, 'contact')

      return {
        success: true,
        needsPhoneConfirmation: false,
        contactId: txResult.contact.id,
        dealId: txResult.dealId,
        current: quota.current,
        limit: quota.limit,
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new Error(
          'Já existe um contato com este email nesta organização.',
        )
      }
      throw error
    }
  })
