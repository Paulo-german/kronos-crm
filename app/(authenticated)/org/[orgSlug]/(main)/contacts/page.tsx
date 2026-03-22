import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getContactsPaginated } from '@/_data-access/contact/get-contacts'
import { getCompanies } from '@/_data-access/company/get-companies'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { ContactsListClient } from './_components/contacts-list-client'
import { parseContactListParams } from './_lib/contact-list-params'

interface ContactsPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const ContactsPage = async ({ params, searchParams }: ContactsPageProps) => {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams
  const ctx = await getOrgContext(orgSlug)
  const listParams = parseContactListParams(resolvedSearchParams)

  const [result, companies, quota, members] = await Promise.all([
    getContactsPaginated(ctx, listParams),
    getCompanies(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'contact'),
    getOrganizationMembers(ctx.orgId),
  ])

  return (
    <ContactsListClient
      contacts={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={result.totalPages}
      companyOptions={companies}
      members={members.accepted}
      currentUserId={ctx.userId}
      userRole={ctx.userRole}
      withinQuota={quota.withinQuota}
      orgSlug={orgSlug}
    />
  )
}

export default ContactsPage
