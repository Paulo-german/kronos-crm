import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getNotifications } from '@/_data-access/notification/get-notifications'
import { getUnreadNotificationCount } from '@/_data-access/notification/get-unread-notification-count'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'
import { NotificationList } from './_components/notification-list'
import { MarkAllReadButton } from './_components/mark-all-read-button'

interface NotificationsPageProps {
  params: Promise<{ orgSlug: string }>
}

const NotificationsPage = async ({ params }: NotificationsPageProps) => {
  const { orgSlug } = await params
  const { orgId, userId } = await getOrgContext(orgSlug)

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(userId, orgId),
    getUnreadNotificationCount(userId, orgId),
  ])

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Notificações</HeaderTitle>
          <HeaderSubTitle>Histórico de notificações</HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <MarkAllReadButton hasUnread={unreadCount > 0} />
        </HeaderRight>
      </Header>

      <NotificationList notifications={notifications} orgSlug={orgSlug} />
    </div>
  )
}

export default NotificationsPage
