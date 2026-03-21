'use client'

import { ThemeToggle } from '@/_components/theme-toggle'
import { RevalidateCacheButton } from '@/_components/layout/revalidate-cache-button'
import { NotificationBell } from '@/_components/layout/notification-bell'
import { UserAvatarDropdown } from '@/_components/layout/user-avatar-dropdown'
import type { NotificationDto } from '@/_data-access/notification/types'

const DEV_EMAILS = ['paulo.roriz01@gmail.com', 'paulo.german777@gmail.com']

interface TopBarActionsProps {
  user: {
    id: string
    fullName: string | null
    email: string
    avatarUrl: string | null
  }
  orgSlug: string
  initialUnreadCount: number
  initialNotifications: NotificationDto[]
}

export const TopBarActions = ({
  user,
  orgSlug,
  initialUnreadCount,
  initialNotifications,
}: TopBarActionsProps) => {
  const isDevUser = DEV_EMAILS.includes(user.email)

  return (
    <div className="flex items-center gap-1">
      {isDevUser && <RevalidateCacheButton />}

      <NotificationBell
        orgSlug={orgSlug}
        initialUnreadCount={initialUnreadCount}
        initialNotifications={initialNotifications}
      />

      <ThemeToggle />

      <UserAvatarDropdown user={user} orgSlug={orgSlug} />
    </div>
  )
}
