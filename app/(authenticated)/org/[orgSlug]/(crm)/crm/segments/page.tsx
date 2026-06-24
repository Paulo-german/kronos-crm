import SegmentsPage from '@/_components/pages/segments-page'

type PageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function Page(props: PageProps) {
  return SegmentsPage({ ...props, basePath: 'crm' })
}
