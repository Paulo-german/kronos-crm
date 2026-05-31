import { redirect } from 'next/navigation'
import { EntityType } from '@prisma/client'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getContactById } from '@/_data-access/contact/get-contact-by-id'
import { getContactLifecycleHistory } from '@/_data-access/contact/get-contact-lifecycle-history'
import { getCompanies } from '@/_data-access/company/get-companies'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getFieldDefinitions } from '@/_data-access/field-definition/get-field-definitions'
import { getContactCustomFieldValues } from '@/_data-access/contact/get-contact-custom-field-values'
import { getContactPrivacy } from '@/_data-access/privacy/get-contact-privacy'
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

  const [companies, members, lifecycleHistory, allFieldDefinitions, customFieldValues, privacy] = await Promise.all([
    getCompanies(ctx.orgId),
    getOrganizationMembers(ctx.orgId),
    getContactLifecycleHistory(id, ctx),
    getFieldDefinitions(ctx.orgId, EntityType.CONTACT),
    getContactCustomFieldValues(id, ctx.orgId),
    getContactPrivacy(ctx, id),
  ])

  // Apenas campos personalizados (isSystem: false) são passados ao formulário de edição
  const customFieldDefinitions = allFieldDefinitions.filter(
    (definition) => !definition.isSystem,
  )

  return (
    <ContactDetailClient
      contact={contact}
      companies={companies}
      members={members.accepted}
      currentUserId={ctx.userId}
      userRole={ctx.userRole}
      hidePiiFromMembers={ctx.hidePiiFromMembers ?? false}
      orgSlug={orgSlug}
      lifecycleHistory={lifecycleHistory}
      customFieldDefinitions={customFieldDefinitions}
      customFieldValues={customFieldValues}
      privacy={privacy}
    />
  )
}

export default ContactDetailPage
