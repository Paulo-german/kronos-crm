import Link from 'next/link'
import { Megaphone, Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { getAnnouncements } from '@/_data-access/announcement/get-announcements'
import { AnnouncementsTable } from './_components/announcements-table'

const AnnouncementsPage = async () => {
  const announcements = await getAnnouncements()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comunicados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os comunicados enviados para os usuários da plataforma
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/announcements/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Comunicado
          </Link>
        </Button>
      </div>

      {/* Conteúdo */}
      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-16 text-center">
          <Megaphone className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-sm font-medium text-foreground">Nenhum comunicado enviado ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">
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
