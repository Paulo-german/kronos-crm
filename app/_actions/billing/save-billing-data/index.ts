'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { saveBillingDataSchema } from './schema'
import { stripe } from '@/_lib/stripe'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const saveBillingData = orgActionClient
  .schema(saveBillingDataSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'billing', 'create'))

    // Salvar dados cadastrais na organização
    const org = await db.organization.update({
      where: { id: ctx.orgId },
      data: {
        personType: data.personType,
        taxId: data.taxId,
        legalName: data.legalName,
        tradeName: data.tradeName || null,
        billingContactName: data.billingContactName,
        billingContactEmail: data.billingContactEmail,
        billingContactPhone: data.billingContactPhone,
        billingZipCode: data.billingZipCode,
        billingStreet: data.billingStreet,
        billingNumber: data.billingNumber,
        billingComplement: data.billingComplement || null,
        billingNeighborhood: data.billingNeighborhood,
        billingCity: data.billingCity,
        billingState: data.billingState,
      },
      select: { stripeCustomerId: true, name: true },
    })

    // Sincronizar com Stripe Customer
    const customerData = {
      name: data.legalName,
      email: data.billingContactEmail,
      phone: data.billingContactPhone,
      address: {
        line1: `${data.billingStreet}, ${data.billingNumber}`,
        line2: data.billingComplement || undefined,
        city: data.billingCity,
        state: data.billingState,
        postal_code: data.billingZipCode,
        country: 'BR',
      },
      preferred_locales: ['pt-BR'],
      metadata: {
        organizationId: ctx.orgId,
        taxId: data.taxId,
        personType: data.personType,
      },
    }

    if (org.stripeCustomerId) {
      // Atualizar Customer existente
      await stripe.customers.update(org.stripeCustomerId, customerData)

      // Atualizar/Criar TaxID via API separada (Stripe não permite via update)
      try {
        const taxIds = await stripe.customers.listTaxIds(org.stripeCustomerId, {
          limit: 1,
        })

        // Se não tem tax_id, criar
        if (taxIds.data.length === 0) {
          await stripe.customers.createTaxId(org.stripeCustomerId, {
            type: data.personType === 'PJ' ? 'br_cnpj' : 'br_cpf',
            value: data.taxId,
          })
        }
      } catch (error) {
        console.warn('[BillingData] Failed to update tax_id:', error)
      }
    } else {
      // Criar novo Customer com tax_id_data
      const customer = await stripe.customers.create({
        ...customerData,
        tax_id_data: [
          {
            type: data.personType === 'PJ' ? 'br_cnpj' : 'br_cpf',
            value: data.taxId,
          },
        ],
      })

      await db.organization.update({
        where: { id: ctx.orgId },
        data: { stripeCustomerId: customer.id },
      })
    }

    return { success: true }
  })
