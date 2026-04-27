'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ThemeToggle } from '@/_components/theme-toggle'
import { GlobalSearch } from '@/_components/global-search'
import { RevalidateCacheButton } from '@/_components/layout/revalidate-cache-button'
import { KronosLogo } from '@/_components/icons/kronos-logo'

const DEV_EMAILS = ['paulo.roriz01@gmail.com', 'paulo.german777@gmail.com']

interface HeaderStickProps {
  userEmail?: string | null
}

const HeaderStick = ({ userEmail }: HeaderStickProps) => {
  const params = useParams()
  const orgSlug = params?.orgSlug as string | undefined

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background px-6">
      <Link
        href={orgSlug ? `/org/${orgSlug}/dashboard` : '/'}
        className="flex items-center gap-2 font-bold text-foreground"
      >
        <KronosLogo className="text-primary" />
        <span className="text-xl font-bold tracking-tight">KRONOS</span>
        <span className="-translate-y-1 relative ml-0.5 align-top text-[10px] font-semibold tracking-widest text-primary">HUB</span>
      </Link>

      <div className="flex items-center gap-1">
        {userEmail && DEV_EMAILS.includes(userEmail) && <RevalidateCacheButton />}
        <GlobalSearch />
        <ThemeToggle />
      </div>
    </header>
  )
}

export default HeaderStick
