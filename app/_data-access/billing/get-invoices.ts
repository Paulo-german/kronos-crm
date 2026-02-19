import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { stripe } from '@/_lib/stripe'

export interface InvoiceDto {
  id: string
  number: string | null
  status: string | null
  amountDue: number
  amountPaid: number
  currency: string
  created: number
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
}

const fetchInvoicesFromStripe = async (
  orgId: string,
): Promise<InvoiceDto[]> => {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  })

  if (!org?.stripeCustomerId) {
    return []
  }

  const response = await stripe.invoices.list({
    customer: org.stripeCustomerId,
    limit: 24,
  })

  return response.data.map((inv) => ({
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
}

/**
 * Busca faturas do Stripe para a organização (Cacheado)
 */
export const getInvoices = async (orgId: string): Promise<InvoiceDto[]> => {
  const getCached = unstable_cache(
    async () => fetchInvoicesFromStripe(orgId),
    [`invoices-${orgId}`],
    {
      tags: [`subscriptions:${orgId}`],
      revalidate: 300,
    },
  )

  return getCached()
}
