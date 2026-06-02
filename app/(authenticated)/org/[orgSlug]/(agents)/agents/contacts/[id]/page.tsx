import ContactDetailPage from '@/_components/pages/contact-detail-page'

type PageProps = { params: Promise<{ id: string; orgSlug: string }> }

export default async function Page({ params }: PageProps) {
  return ContactDetailPage({
    params,
    contactsHref: (slug) => `/org/${slug}/agents/contacts`,
  })
}
