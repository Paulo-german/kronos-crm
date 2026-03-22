import Link from 'next/link'
import { Megaphone, Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import Header, { HeaderLeft, HeaderRight, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getAnnouncements } from '@/_data-access/announcement/get-announcements'
import { AnnouncementsTable } from './_components/announcements-table'

const AnnouncementsPage = async () => {
  const announcements = await getAnnouncements()

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Comunicados</HeaderTitle>
          <HeaderSubTitle>
            Gerencie os comunicados enviados para os usuários da plataforma
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <Button asChild>
            <Link href="/admin/announcements/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo Comunicado
            </Link>
          </Button>
        </HeaderRight>
      </Header>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 py-16 text-center transition-all duration-200">
          <Megaphone className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">Nenhum comunicado enviado ainda</h3>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Crie um comunicado para notificar todos os usuários da plataforma.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/admin/announcements/new">
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro comunicado
            </Link>
          </Button>
        </div>
      ) : (
        <AnnouncementsTable announcements={announcements} />
      )}
    </div>
  )
}

export default AnnouncementsPage
