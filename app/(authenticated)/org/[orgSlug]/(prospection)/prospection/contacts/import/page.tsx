import ContactImportPage from '@/_components/pages/contact-import-page'

type PageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function Page({ params }: PageProps) {
  return ContactImportPage({ params, basePath: 'prospection' })
}
