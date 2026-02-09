import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getDealDetails } from '@/_data-access/deal/get-deal-details'
import { getProducts } from '@/_data-access/product/get-products'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import DealDetailClient from './_components/deal-detail-client'

import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'

interface DealPageProps {
  params: Promise<{ id: string; orgSlug: string }>
}

const DealPage = async ({ params }: DealPageProps) => {
  const { id, orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // Passa o contexto RBAC completo
  const deal = await getDealDetails(id, ctx)
  if (!deal) {
    redirect(`/org/${orgSlug}/pipeline`)
  }

  // Produtos são globais na org, não precisam de RBAC ownership
  const products = await getProducts(ctx.orgId)

  // Contatos, deals e MEMBROS com RBAC
  const [contacts, dealOptions, members] = await Promise.all([
    getContacts(ctx),
    getDealsOptions(ctx),
    getOrganizationMembers(ctx.orgId),
  ])

  return (
    <div className="h-full w-full">
      <DealDetailClient
        deal={deal}
        products={products}
        contacts={contacts}
        dealOptions={dealOptions}
        members={members.accepted}
        currentUserId={ctx.userId}
        userRole={ctx.userRole}
      />
    </div>
  )
}

export default DealPage
