import { createClient } from '@/_lib/supabase/server'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getCompanies } from '@/_data-access/company/get-companies'
import { ContactsDataTable } from '@/(authenticated)/contacts/_components/contacts-data-table'
import CreateContactButton from '@/(authenticated)/contacts/_components/create-contact-button'

const ContactsPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [contacts, companies] = await Promise.all([
    getContacts(user.id),
    getCompanies(user.id),
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
