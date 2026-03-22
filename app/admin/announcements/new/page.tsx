import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getAllOrganizations } from '@/_data-access/announcement/get-all-organizations'
import { CreateAnnouncementForm } from '../_components/create-announcement-form'

const NewAnnouncementPage = async () => {
  const organizations = await getAllOrganizations()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/announcements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <Header>
        <HeaderLeft>
          <HeaderTitle>Novo Comunicado</HeaderTitle>
          <HeaderSubTitle>
            Envie uma notificação para usuários de toda a plataforma ou de organizações
            específicas.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <CreateAnnouncementForm organizations={organizations} />
    </div>
  )
}

export default NewAnnouncementPage
