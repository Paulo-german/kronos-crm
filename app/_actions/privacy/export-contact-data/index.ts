'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import { exportContactDataSchema } from './schema'

const EXPORT_MESSAGE_LIMIT = 50

export const exportContactData = orgActionClient
  .schema(exportContactDataSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    if (!isElevated(ctx.userRole)) {
      throw new Error('Apenas administradores podem exportar dados de contatos.')
    }

    const contact = await db.contact.findFirst({
      where: { id: data.contactId, organizationId: ctx.orgId },
      include: {
        privacy: {
          include: {
            events: { orderBy: { createdAt: 'desc' } },
          },
        },
        deals: {
          include: {
            deal: {
              select: { id: true, title: true, value: true, status: true, createdAt: true },
            },
          },
        },
        conversations: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            _count: { select: { messages: true } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: EXPORT_MESSAGE_LIMIT,
              select: { id: true, content: true, role: true, createdAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        appointments: {
          select: { id: true, title: true, startDate: true, status: true, createdAt: true },
          orderBy: { startDate: 'desc' },
          take: 20,
        },
        lifecycleHistory: {
          select: { fromStage: true, toStage: true, causeType: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!contact) {
      throw new Error('Contato não encontrado ou não pertence à organização.')
    }

    if (data.dsrRequestId) {
      await db.dsrRequest.update({
        where: { id: data.dsrRequestId, organizationId: ctx.orgId },
        data: {
          status: 'COMPLETED',
          resolvedBy: ctx.userId,
          resolvedAt: new Date(),
        },
      })

      revalidateTag(`dsr-requests:${ctx.orgId}`)
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportedBy: ctx.userId,
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        lifecycleStage: contact.lifecycleStage,
        customerStatus: contact.customerStatus,
        firstCaptureChannel: contact.firstCaptureChannel,
        firstCaptureAt: contact.firstCaptureAt,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
        anonymizedAt: contact.anonymizedAt,
      },
      privacy: contact.privacy
        ? {
            legalBasis: contact.privacy.legalBasis,
            legalBasisSource: contact.privacy.legalBasisSource,
            consentedAt: contact.privacy.consentedAt,
            consentText: contact.privacy.consentText,
            ccpaSaleOptOut: contact.privacy.ccpaSaleOptOut,
            consentHistory: contact.privacy.events.map((event) => ({
              eventType: event.eventType,
              legalBasis: event.legalBasis,
              performedBy: event.performedBy,
              notes: event.notes,
              createdAt: event.createdAt,
            })),
          }
        : null,
      deals: contact.deals.map((dealContact) => dealContact.deal),
      conversations: contact.conversations.map((conversation) => ({
        id: conversation.id,
        status: conversation.status,
        totalMessages: conversation._count.messages,
        recentMessages: conversation.messages,
        createdAt: conversation.createdAt,
      })),
      appointments: contact.appointments,
      lifecycleHistory: contact.lifecycleHistory,
    }

    return { success: true, data: exportPayload }
  })
