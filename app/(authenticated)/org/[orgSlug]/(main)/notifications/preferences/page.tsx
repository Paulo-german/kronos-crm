import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getNotificationPreferences } from '@/_data-access/notification/get-notification-preferences'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'
import { Button } from '@/_components/ui/button'
import { NotificationPreferencesForm } from './_components/notification-preferences-form'

interface NotificationPreferencesPageProps {
  params: Promise<{ orgSlug: string }>
}

const NotificationPreferencesPage = async ({ params }: NotificationPreferencesPageProps) => {
  const { orgSlug } = await params
  const { userId } = await getOrgContext(orgSlug)

  const preferences = await getNotificationPreferences(userId)

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Preferências de Notificação</HeaderTitle>
          <HeaderSubTitle>Configure quais notificações você deseja receber</HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/org/${orgSlug}/notifications`}>
              <ChevronLeft className="mr-1.5 size-4" />
              Voltar
            </Link>
          </Button>
        </HeaderRight>
      </Header>

      <NotificationPreferencesForm preferences={preferences} />
    </div>
  )
}

export default NotificationPreferencesPage
