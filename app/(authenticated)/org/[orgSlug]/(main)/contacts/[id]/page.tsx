import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getContactById } from '@/_data-access/contact/get-contact-by-id'
import { getCompanies } from '@/_data-access/company/get-companies'
import { notFound } from 'next/navigation'
import ContactDetailClient from './_components/contact-detail-client'

import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'

interface ContactDetailsPageProps {
  params: Promise<{ id: string; orgSlug: string }>
}

const ContactDetailsPage = async ({ params }: ContactDetailsPageProps) => {
  const { id, orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // Busca paralela com contexto RBAC
  const [contact, companies, members] = await Promise.all([
    getContactById(id, ctx),
    getCompanies(ctx.orgId),
    getOrganizationMembers(ctx.orgId),
  ])

  if (!contact) {
    notFound()
  }

  return (
    <ContactDetailClient
      contact={contact}
      companies={companies}
      members={members.accepted}
      currentUserId={ctx.userId}
      userRole={ctx.userRole}
    />
  )
}

export default ContactDetailsPage
