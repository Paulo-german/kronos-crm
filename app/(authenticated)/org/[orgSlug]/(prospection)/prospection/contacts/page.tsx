import ContactsPage from '@/_components/pages/contacts-page'

type PageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Page(props: PageProps) {
  return ContactsPage({ ...props, basePath: 'prospection' })
}
