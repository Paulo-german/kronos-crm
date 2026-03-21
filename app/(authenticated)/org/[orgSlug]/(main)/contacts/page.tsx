import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getContacts } from '@/_data-access/contact/get-contacts'
import { getCompanies } from '@/_data-access/company/get-companies'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { ContactsDataTable } from './_components/contacts-data-table'
import CreateContactButton from './_components/create-contact-button'
import { QuotaHint } from '@/_components/trial/quota-hint'
import Link from 'next/link'
import { Button } from '@/_components/ui/button'
import { Upload } from 'lucide-react'
import { PageTourTrigger } from '@/_components/onboarding/page-tour-trigger'
import { CONTACTS_TOUR_STEPS } from '@/_lib/onboarding/tours/contacts-tour'

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
      <div className="flex items-center gap-2">
        <QuotaHint orgId={ctx.orgId} entity="contact" />
        <div className="flex-1" />
        <Button variant="outline" asChild>
          <Link href={`/org/${orgSlug}/contacts/import`}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Link>
        </Button>
        <div data-tour="contacts-create">
          <CreateContactButton
            companyOptions={companies}
            withinQuota={quota.withinQuota}
          />
        </div>
      </div>
      <div data-tour="contacts-table">
        <ContactsDataTable
          contacts={contacts}
          companyOptions={companies}
        />
      </div>

      <PageTourTrigger tourId="contacts" steps={CONTACTS_TOUR_STEPS} />
    </div>
  )
}

export default ContactsPage
