import Link from 'next/link'
import { GlobalSearch } from '@/_components/global-search'
import { TopBarActions } from '@/_components/layout/top-bar-actions'
import { MobileSidebar } from '@/_components/layout/mobile-sidebar'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import type { NotificationDto } from '@/_data-access/notification/types'
import type { ModuleSlug } from '@/_data-access/module/types'
import type { MemberRole } from '@prisma/client'

export interface SidebarProps {
  activeModules?: ModuleSlug[]
  organizations?: { id: string; name: string; slug: string; role: MemberRole }[]
  isSuperAdmin?: boolean
  credits?: { available: number; monthlyLimit: number; orgSlug: string }
  planSlug?: string | null
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
  completedTutorialIds: string[]
  sidebarProps?: SidebarProps
}

export const TopBar = ({
  user,
  orgSlug,
  initialUnreadCount,
  initialNotifications,
  completedTutorialIds,
  sidebarProps,
}: TopBarProps) => {
  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between bg-background px-4 shadow-[0_2px_24px_0_hsl(261_8%_20%/0.20)]">
      <div className="flex items-center gap-3">
        {sidebarProps && <MobileSidebar {...sidebarProps} />}
        <Link
          href={`/org/${orgSlug}/dashboard`}
          className="hidden items-center gap-2 md:flex"
        >
          <KronosLogo className="text-foreground" />
          <span className="text-xl font-bold tracking-tight text-foreground">KRONOS</span>
          <span className="relative ml-0.5 -translate-y-1 align-top text-[10px] font-semibold tracking-widest text-primary">
            HUB
          </span>
        </Link>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <GlobalSearch />
      </div>

      <TopBarActions
        user={user}
        orgSlug={orgSlug}
        initialUnreadCount={initialUnreadCount}
        initialNotifications={initialNotifications}
        completedTutorialIds={completedTutorialIds}
      />
    </header>
  )
}
