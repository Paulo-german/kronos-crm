import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getCompanies } from '@/_data-access/company/get-companies'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { ContactsDataTable } from './_components/contacts-data-table'
import CreateContactButton from './_components/create-contact-button'
import { QuotaHint } from '@/_components/trial/quota-hint'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'

interface ContactsPageProps {
  params: Promise<{ orgSlug: string }>
}

const ContactsPage = async ({ params }: ContactsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [contacts, companies, quota] = await Promise.all([
    getContacts(ctx),
    getCompanies(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'contact'),
  ])

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Contatos</HeaderTitle>
          <HeaderSubTitle>Gerencie seus contatos e leads</HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="contact" />
        </HeaderLeft>
        <HeaderRight>
          <CreateContactButton
            companyOptions={companies}
            withinQuota={quota.withinQuota}
          />
        </HeaderRight>
      </Header>
      <ContactsDataTable contacts={contacts} companyOptions={companies} />
    </div>
  )
}

export default ContactsPage
