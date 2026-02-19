'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { listInvoicesSchema } from './schema'
import { stripe } from '@/_lib/stripe'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const listInvoices = orgActionClient
  .schema(listInvoicesSchema)
  .action(async ({ ctx }) => {
    requirePermission(canPerformAction(ctx, 'billing', 'read'))

    const org = await db.organization.findUniqueOrThrow({
      where: { id: ctx.orgId },
      select: { stripeCustomerId: true },
    })

    if (!org.stripeCustomerId) {
      return { invoices: [] }
    }

    const response = await stripe.invoices.list({
      customer: org.stripeCustomerId,
      limit: 24,
    })

    const invoices = response.data.map((inv) => ({
      id: inv.id,
      number: inv.number ?? null,
      status: inv.status ?? null,
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      created: inv.created,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdf: inv.invoice_pdf ?? null,
    }))

    return { invoices }
  })
