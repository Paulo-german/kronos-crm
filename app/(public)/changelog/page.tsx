import type { Metadata } from 'next'
import { getChangelogEntriesPublic } from '@/_data-access/changelog'
import { ChangelogContent } from './_components/changelog-content'

export const metadata: Metadata = {
  title: 'Novidades | Kronos CRM',
  description:
    'Veja as últimas novidades, melhorias e correções do Kronos CRM.',
}

const ChangelogPublicPage = async () => {
  const entries = await getChangelogEntriesPublic()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Novidades
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Veja o que há de novo no Kronos. Estamos sempre trabalhando para
          melhorar sua experiência.
        </p>
      </div>

      <ChangelogContent entries={entries} />
    </div>
  )
}

export default ChangelogPublicPage
