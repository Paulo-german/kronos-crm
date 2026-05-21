import { KronosLogo } from '@/_components/icons/kronos-logo'
import { UserAvatarDropdown } from '@/_components/layout/user-avatar-dropdown'

interface AccountTopBarProps {
  user: {
    fullName: string | null
    email: string
    avatarUrl: string | null
  }
}

export function AccountTopBar({ user }: AccountTopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background px-6">
      <KronosLogo className="text-foreground" />
      <UserAvatarDropdown user={user} />
    </header>
  )
}
