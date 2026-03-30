import { GlobalSearch } from '@/_components/global-search'
import { TopBarActions } from '@/_components/layout/top-bar-actions'
import { MobileSidebar } from '@/_components/layout/mobile-sidebar'
import type { NotificationDto } from '@/_data-access/notification/types'
import type { ModuleSlug } from '@/_data-access/module/types'
import type { MemberRole } from '@prisma/client'

export interface SidebarProps {
  activeModules?: ModuleSlug[]
  organizations?: { id: string; name: string; slug: string; role: MemberRole }[]
  isSuperAdmin?: boolean
  credits?: { available: number; monthlyLimit: number; orgSlug: string }
}

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
  sidebarProps?: SidebarProps
}

export const TopBar = ({
  user,
  orgSlug,
  initialUnreadCount,
  initialNotifications,
  sidebarProps,
}: TopBarProps) => {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-background px-4">
      <div className="flex items-center gap-2">
        {sidebarProps && <MobileSidebar {...sidebarProps} />}
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
