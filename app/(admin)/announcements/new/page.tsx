import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { getAllOrganizations } from '@/_data-access/announcement/get-all-organizations'
import { CreateAnnouncementForm } from '../_components/create-announcement-form'

const NewAnnouncementPage = async () => {
  const organizations = await getAllOrganizations()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/announcements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo Comunicado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie uma notificação para usuários de toda a plataforma ou de organizações
          específicas.
        </p>
      </div>

      <CreateAnnouncementForm organizations={organizations} />
    </div>
  )
}

export default NewAnnouncementPage
