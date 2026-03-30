'use client'

import { usePathname } from 'next/navigation'
import { TopBar } from '@/_components/layout/top-bar'
import { MobileSidebar } from '@/_components/layout/mobile-sidebar'
import type { NotificationDto } from '@/_data-access/notification/types'
import type { SidebarProps } from '@/_components/layout/top-bar'

interface TopBarWrapperProps {
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

export const TopBarWrapper = (props: TopBarWrapperProps) => {
  const pathname = usePathname()
  const isInbox = /\/inbox(\/|$)/.test(pathname)

  if (isInbox) {
    return (
      <div className="flex h-12 items-center px-4 md:hidden">
        {props.sidebarProps && <MobileSidebar {...props.sidebarProps} />}
      </div>
    )
  }

  return <TopBar {...props} />
}
