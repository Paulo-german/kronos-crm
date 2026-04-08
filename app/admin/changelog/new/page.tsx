import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { UpsertChangelogForm } from '../_components/upsert-changelog-form'

const NewChangelogEntryPage = () => {
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
          <HeaderTitle>Nova Entrada</HeaderTitle>
          <HeaderSubTitle>
            Crie uma entrada de changelog para comunicar novidades, melhorias ou correções aos
            usuários.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <UpsertChangelogForm />
    </div>
  )
}

export default NewChangelogEntryPage
