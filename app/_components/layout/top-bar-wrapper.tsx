'use client'

import { usePathname } from 'next/navigation'
import { TopBar } from '@/_components/layout/top-bar'
import type { NotificationDto } from '@/_data-access/notification/types'

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
}

export const TopBarWrapper = (props: TopBarWrapperProps) => {
  const pathname = usePathname()
  const isInbox = /\/inbox(\/|$)/.test(pathname)

  if (isInbox) return null

  return <TopBar {...props} />
}
