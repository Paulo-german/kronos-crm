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
import { getOrgModules } from '@/_data-access/module/get-org-modules'
import { resolveContactCapabilities } from '@/_lib/contact/contact-capabilities'
import { ContactCapabilitiesProvider } from '@/_components/contacts/_lib/contact-capabilities-context'
import ContactDetailClient from '@/_components/contacts/[id]/_components/contact-detail-client'

interface ContactDetailPageProps {
  params: Promise<{ id: string; orgSlug: string }>
  contactsHref?: (orgSlug: string) => string
  // Produto que renderiza o detalhe (crm | prospection | inbox | agents)
  basePath?: string
}

const ContactDetailPage = async ({
  params,
  contactsHref,
  basePath = 'crm',
}: ContactDetailPageProps) => {
  const { id, orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const contact = await getContactById(id, ctx)
  if (!contact) {
    redirect(
      contactsHref
        ? contactsHref(orgSlug)
        : `/org/${orgSlug}/${basePath}/contacts`,
    )
  }

  const [
    companies,
    members,
    lifecycleHistory,
    allFieldDefinitions,
    customFieldValues,
    privacy,
    orgModules,
  ] = await Promise.all([
    getCompanies(ctx.orgId),
    getOrganizationMembers(ctx.orgId),
    getContactLifecycleHistory(id, ctx),
    getFieldDefinitions(ctx.orgId, EntityType.CONTACT),
    getContactCustomFieldValues(id, ctx.orgId),
    getContactPrivacy(ctx, id),
    getOrgModules(ctx.orgId),
  ])

  const customFieldDefinitions = allFieldDefinitions.filter(
    (definition) => !definition.isSystem,
  )

  const capabilities = resolveContactCapabilities(
    orgModules.map((mod) => mod.slug),
  )

  return (
    <ContactCapabilitiesProvider
      capabilities={capabilities}
      basePath={basePath}
    >
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
    </ContactCapabilitiesProvider>
  )
}

export default ContactDetailPage
