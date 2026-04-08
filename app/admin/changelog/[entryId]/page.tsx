import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getChangelogEntryById } from '@/_data-access/changelog'
import { UpsertChangelogForm } from '../_components/upsert-changelog-form'

interface EditChangelogEntryPageProps {
  params: Promise<{ entryId: string }>
}

const EditChangelogEntryPage = async ({ params }: EditChangelogEntryPageProps) => {
  const { entryId } = await params
  const entry = await getChangelogEntryById(entryId)

  if (!entry) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/changelog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <Header>
        <HeaderLeft>
          <HeaderTitle>Editar Entrada</HeaderTitle>
          <HeaderSubTitle>
            Edite o conteúdo, tipo ou status de publicação desta entrada do changelog.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <UpsertChangelogForm defaultValues={entry} />
    </div>
  )
}

export default EditChangelogEntryPage
