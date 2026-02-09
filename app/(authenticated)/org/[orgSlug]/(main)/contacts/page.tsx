import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getCompanies } from '@/_data-access/company/get-companies'
import { ContactsDataTable } from './_components/contacts-data-table'
import CreateContactButton from './_components/create-contact-button'

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-muted-foreground">
            Gerencie seus contatos e leads.
          </p>
        </div>
        <CreateContactButton companyOptions={companies} />
      </div>
      <ContactsDataTable contacts={contacts} companyOptions={companies} />
    </div>
  )
}

export default ContactsPage
