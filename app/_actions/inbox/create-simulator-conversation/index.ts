'use server'

import { revalidateTag } from 'next/cache'
import { LifecycleCauseType, LifecycleStage, Prisma } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission, isElevated } from '@/_lib/rbac'
import { getConversationAsDto } from '@/_data-access/conversation/get-conversations'
import { advanceContactLifecycle } from '@/_lib/lifecycle/advance-contact-lifecycle'
import {
  SIMULATOR_CONTACT_PHONE,
  SIMULATOR_DEAL_TITLE,
  SIMULATOR_REMOTE_JID,
} from '@/_lib/simulator'
import {
  agentCreatesDealViaLifecycle,
  resetSimulatorContactState,
} from '../_lib/simulator-contact'
import { createSimulatorConversationSchema } from './schema'

// Nome padrão do contato simulado quando nenhuma persona é informada.
const DEFAULT_SIMULATOR_CONTACT_NAME = 'Você (Simulador)'

export const createSimulatorConversation = orgActionClient
  .schema(createSimulatorConversationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Guard adicional: apenas super admins podem usar o simulador.
    // Usamos orgActionClient (não superAdminActionClient) porque precisamos de ctx.orgId e ctx.userRole.
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { isSuperAdmin: true },
    })

    if (!user?.isSuperAdmin) {
      throw new Error('Acesso negado.')
    }

    // 1. RBAC: verificar permissão de criação de conversa
    requirePermission(canPerformAction(ctx, 'conversation', 'create'))

    // 2. Validar que o agente pertence à organização e carregar pipelineIds
    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
      select: {
        id: true,
        isActive: true,
        pipelineIds: true,
        steps: { select: { lifecycleTrigger: true } },
      },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    // Quando o agente cria o deal via lifecycle (step com trigger OPPORTUNITY),
    // o simulador NÃO cria o deal na largada — ele nasce pelo lifecycle, como em
    // produção. Caso contrário, criamos o deal para as tools de deal funcionarem.
    const lifecycleCreatesDeal = agentCreatesDealViaLifecycle(agent.steps)

    // 3. Resolver primeira stage do primeiro pipeline configurado no agente.
    // Sem pipeline configurado, o simulador segue sem deal — tools de deal falharão
    // como em produção quando a conversa chega sem negociação vinculada.
    const firstStage =
      agent.pipelineIds.length > 0
        ? await db.pipelineStage.findFirst({
            where: {
              pipelineId: agent.pipelineIds[0],
              pipeline: { organizationId: ctx.orgId },
            },
            orderBy: { position: 'asc' },
            select: { id: true },
          })
        : null

    // 4. Buscar ou criar inbox SIMULATOR (singleton por org)
    let inbox = await db.inbox.findFirst({
      where: { organizationId: ctx.orgId, connectionType: 'SIMULATOR' },
      select: { id: true, agentId: true },
    })

    if (!inbox) {
      inbox = await db.inbox.create({
        data: {
          organizationId: ctx.orgId,
          name: 'Simulador',
          channel: 'WHATSAPP',
          connectionType: 'SIMULATOR',
          agentId: data.agentId,
        },
        select: { id: true, agentId: true },
      })
    } else if (inbox.agentId !== data.agentId) {
      // Atualizar o agente quando o usuário escolhe um diferente para simular
      await db.inbox.update({
        where: { id: inbox.id },
        data: { agentId: data.agentId },
      })
    }

    const inboxId = inbox.id

    // 5. Buscar ou criar contato virtual para esta org, aplicando a persona (MVP: campos
    // nativos). Sem persona, o contato volta ao default — torna o contato determinístico por run.
    const personaName =
      data.persona?.name?.trim() || DEFAULT_SIMULATOR_CONTACT_NAME
    const personaEmail = data.persona?.email?.trim() || null
    const personaRole = data.persona?.role?.trim() || null

    let contact = await db.contact.findFirst({
      where: { organizationId: ctx.orgId, phone: SIMULATOR_CONTACT_PHONE },
      select: { id: true },
    })

    // Contact tem @@unique([organizationId, email]); um e-mail de persona que já exista em
    // outro contato da org dispara P2002 — traduzimos para mensagem amigável.
    try {
      if (contact) {
        await db.contact.update({
          where: { id: contact.id },
          data: { name: personaName, email: personaEmail, role: personaRole },
        })
      } else {
        contact = await db.contact.create({
          data: {
            organizationId: ctx.orgId,
            name: personaName,
            email: personaEmail,
            role: personaRole,
            phone: SIMULATOR_CONTACT_PHONE,
            assignedTo: ctx.userId,
          },
          select: { id: true },
        })
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new Error(
          'Já existe um contato com este e-mail nesta organização.',
        )
      }
      throw error
    }

    const contactId = contact.id

    // 6. Reset: deletar conversa anterior (se existir) junto com o deal simulado antigo.
    // Conversation.dealId tem FK sem cascade, então deletar a conversa deixa o deal órfão —
    // precisamos apagar o deal explicitamente para evitar acúmulo entre simulações.
    const existing = await db.conversation.findFirst({
      where: { inboxId, contactId, channel: 'WHATSAPP' },
      select: { id: true, dealId: true },
    })

    if (existing) {
      // Transação: conversa e deal somem juntos ou nada some — evita deal órfão.
      await db.$transaction([
        db.conversation.delete({ where: { id: existing.id } }),
        ...(existing.dealId
          ? [db.deal.delete({ where: { id: existing.dealId } })]
          : []),
      ])
    }

    // 6b. Resetar todo o estado de lifecycle do contato (reutilizado entre
    // simulações) para que triggers de lifecycle voltem a disparar do zero.
    await resetSimulatorContactState(contactId, ctx.orgId)

    // Stage inicial semeado (default LEAD). Quando semeamos >= OPPORTUNITY, o lifecycle não vai
    // re-disparar (é monotônico e o contato já estará no stage), então PRECISAMOS criar o deal
    // aqui — senão a simulação ficaria em OPPORTUNITY sem negociação vinculada.
    const seededStage = data.initialLifecycleStage ?? 'LEAD'
    const seedAtOrPastOpportunity =
      seededStage === 'OPPORTUNITY' || seededStage === 'CUSTOMER'
    const shouldCreateDeal =
      !!firstStage && (seedAtOrPastOpportunity || !lifecycleCreatesDeal)

    // 7. Criar conversa + deal em transação atômica.
    const created = await db.$transaction(async (tx) => {
      const newConversation = await tx.conversation.create({
        data: {
          inboxId,
          organizationId: ctx.orgId,
          contactId,
          channel: 'WHATSAPP',
          remoteJid: SIMULATOR_REMOTE_JID,
          aiPaused: false,
          assignedTo: ctx.userId,
        },
        select: { id: true },
      })

      if (!shouldCreateDeal) {
        return {
          conversationId: newConversation.id,
          dealId: null as string | null,
        }
      }

      const newDeal = await tx.deal.create({
        data: {
          organizationId: ctx.orgId,
          title: SIMULATOR_DEAL_TITLE,
          pipelineStageId: firstStage.id,
          assignedTo: ctx.userId,
          contacts: {
            create: { contactId, isPrimary: true, role: '' },
          },
        },
        select: { id: true },
      })

      await tx.conversation.update({
        where: { id: newConversation.id },
        data: { dealId: newDeal.id },
      })

      return { conversationId: newConversation.id, dealId: newDeal.id }
    })

    // 7b. Semear o lifecycle no ponto de partida escolhido. advanceContactLifecycle é monotônico
    // (do LEAD pós-reset só avança), seta timestamps/customerStatus, grava ContactLifecycleHistory
    // e recalcula health score — reuso direto, sem reimplementar a transição.
    if (seededStage !== 'LEAD') {
      await advanceContactLifecycle({
        contactId,
        organizationId: ctx.orgId,
        toStage: seededStage as LifecycleStage,
        causeType: LifecycleCauseType.MANUAL,
        causeRefId: created.conversationId,
        changedByUserId: ctx.userId,
      })
    }

    // 8. Invalidar caches relevantes (inbox + CRM, já que o deal aparece em queries filtradas)
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`contacts:${ctx.orgId}`)
    revalidateTag(`inboxes:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)
    revalidateTag(`dashboard-charts:${ctx.orgId}`)

    // 9. Retornar DTO da conversa para a UI selecionar imediatamente no inbox
    const elevated = isElevated(ctx.userRole)
    const hidePii = ctx.hidePiiFromMembers ?? false
    const dto = await getConversationAsDto(
      ctx.orgId,
      created.conversationId,
      elevated,
      hidePii,
    )

    return { conversation: dto }
  })
