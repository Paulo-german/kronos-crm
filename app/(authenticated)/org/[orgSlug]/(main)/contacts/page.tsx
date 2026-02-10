import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getCompanies } from '@/_data-access/company/get-companies'
import { ContactsDataTable } from './_components/contacts-data-table'
import CreateContactButton from './_components/create-contact-button'
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

  const [contacts, companies] = await Promise.all([
    getContacts(ctx), // Passa o contexto RBAC completo
    getCompanies(ctx.orgId),
  ])

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Contatos</HeaderTitle>
          <HeaderSubTitle>Gerencie seus contatos e leads</HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <CreateContactButton companyOptions={companies} />
        </HeaderRight>
      </Header>
      <ContactsDataTable contacts={contacts} companyOptions={companies} />
    </div>
  )
}

export default ContactsPage
