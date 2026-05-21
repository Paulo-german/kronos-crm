import Link from 'next/link'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { UserAvatarDropdown } from '@/_components/layout/user-avatar-dropdown'
import { ThemeToggle } from '@/_components/theme-toggle'

interface AccountTopBarProps {
  user: {
    fullName: string | null
    email: string
    avatarUrl: string | null
  }
}

export function AccountTopBar({ user }: AccountTopBarProps) {
  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between bg-background px-4 shadow-[0_2px_24px_0_hsl(261_8%_20%/0.20)]">
      <Link href="/org" className="flex items-center gap-2">
        <KronosLogo className="text-foreground" />
        <span className="text-xl font-bold tracking-tight text-foreground">KRONOS</span>
        <span className="relative ml-0.5 -translate-y-1 align-top text-[10px] font-semibold tracking-widest text-primary">
          HUB
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserAvatarDropdown user={user} />
      </div>
    </header>
  )
}
