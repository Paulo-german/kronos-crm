import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { getNotificationPreferences } from '@/_data-access/notification/get-notification-preferences'
import { NotificationPreferencesForm } from '@/_components/notifications/preferences/_components/notification-preferences-form'
import { BackButton } from '../_components/back-button'

const AccountNotificationsPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const preferences = await getNotificationPreferences(user.id)

  return (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
        <p className="text-muted-foreground">
          Configure quais notificações você deseja receber.
        </p>
      </div>

      <NotificationPreferencesForm preferences={preferences} />
    </div>
  )
}

export default AccountNotificationsPage
