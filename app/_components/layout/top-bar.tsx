import { GlobalSearch } from '@/_components/global-search'
import { TopBarActions } from '@/_components/layout/top-bar-actions'
import type { NotificationDto } from '@/_data-access/notification/types'

interface TopBarProps {
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

export const TopBar = ({
  user,
  orgSlug,
  initialUnreadCount,
  initialNotifications,
}: TopBarProps) => {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-background px-4">
      <div className="flex items-center">
        <GlobalSearch />
      </div>

      <TopBarActions
        user={user}
        orgSlug={orgSlug}
        initialUnreadCount={initialUnreadCount}
        initialNotifications={initialNotifications}
      />
    </header>
  )
}
