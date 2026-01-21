import { createClient } from '@/_lib/supabase/server'
import { getContactById } from '@/_data-access/contact/get-contact-by-id'
import { getCompanies } from '@/_data-access/company/get-companies'
import { notFound } from 'next/navigation'
import ContactDetailClient from './_components/contact-detail-client'

interface ContactDetailsPageProps {
  params: Promise<{ id: string }>
}

const ContactDetailsPage = async ({ params }: ContactDetailsPageProps) => {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Busca paralela para performance
  const [contact, companies] = await Promise.all([
    getContactById(id, user.id),
    getCompanies(user.id),
  ])

  if (!contact) {
    notFound()
  }

  return <ContactDetailClient contact={contact} companies={companies} />
}

export default ContactDetailsPage
