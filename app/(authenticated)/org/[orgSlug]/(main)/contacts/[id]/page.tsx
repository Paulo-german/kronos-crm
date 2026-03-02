import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getContactById } from '@/_data-access/contact/get-contact-by-id'
import { getCompanies } from '@/_data-access/company/get-companies'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import ContactDetailClient from './_components/contact-detail-client'

interface ContactDetailPageProps {
  params: Promise<{ id: string; orgSlug: string }>
}

const ContactDetailPage = async ({ params }: ContactDetailPageProps) => {
  const { id, orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const contact = await getContactById(id, ctx)
  if (!contact) {
    redirect(`/org/${orgSlug}/contacts`)
  }

  const [companies, members] = await Promise.all([
    getCompanies(ctx.orgId),
    getOrganizationMembers(ctx.orgId),
  ])

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

export default ContactDetailPage
