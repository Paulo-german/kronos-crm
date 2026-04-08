import Link from 'next/link'
import { Newspaper, Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { getChangelogEntriesAdmin } from '@/_data-access/changelog'
import { ChangelogTable } from './_components/changelog-table'

const ChangelogAdminPage = async () => {
  const entries = await getChangelogEntriesAdmin()

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Changelog</HeaderTitle>
          <HeaderSubTitle>
            Gerencie as entradas do changelog visíveis para todos os usuários da plataforma
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <Button asChild>
            <Link href="/admin/changelog/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova Entrada
            </Link>
          </Button>
        </HeaderRight>
      </Header>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-16 text-center transition-all duration-200">
          <Newspaper className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">
            Nenhuma entrada no changelog ainda
          </h3>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Crie a primeira entrada para comunicar novidades e melhorias aos usuários.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/admin/changelog/new">
              <Plus className="mr-2 h-4 w-4" />
              Criar primeira entrada
            </Link>
          </Button>
        </div>
      ) : (
        <ChangelogTable entries={entries} />
      )}
    </div>
  )
}

export default ChangelogAdminPage
