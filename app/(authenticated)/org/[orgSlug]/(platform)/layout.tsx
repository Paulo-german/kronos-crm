import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTrialStatus } from '@/_data-access/billing/get-trial-status'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { getUnreadNotificationCount } from '@/_data-access/notification/get-unread-notification-count'
import { AccountMenu } from '@/_components/layout/account-menu'
import { BackButton } from '@/_components/layout/back-button'
import { NotificationBell } from '@/_components/layout/notification-bell'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { getRecentNotifications } from '@/_data-access/notification/get-recent-notifications'

interface PlatformLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const PlatformLayout = async ({ children, params }: PlatformLayoutProps) => {
  const { orgSlug } = await params
  const { orgId, userId } = await getOrgContext(orgSlug)

  const [trialStatus, user, unreadCount, recentNotifications] = await Promise.all([
    getTrialStatus(orgId),
    getUserById(userId),
    getUnreadNotificationCount(userId, orgId),
    getRecentNotifications(userId, orgId),
  ])

  if (trialStatus.isExpired) {
    redirect(`/org/${orgSlug}/plans`)
  }

  const topBarUser = {
    fullName: user?.fullName ?? null,
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? null,
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background px-4">
        <div className="flex items-center gap-3">
          <BackButton href={`/org/${orgSlug}/crm/home`} />
          <Link href={`/org/${orgSlug}/crm/home`} className="flex items-center gap-2">
            <KronosLogo className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold tracking-tight text-foreground">KRONOS</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell
            orgSlug={orgSlug}
            initialUnreadCount={unreadCount}
            initialNotifications={recentNotifications}
          />
          <AccountMenu user={topBarUser} orgSlug={orgSlug} />
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  )
}

export default PlatformLayout
