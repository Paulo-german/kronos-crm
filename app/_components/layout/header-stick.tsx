'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/_lib/utils'
import { ThemeToggle } from '@/_components/theme-toggle'
import { GlobalSearch } from '@/_components/global-search'
import { RevalidateCacheButton } from '@/_components/layout/revalidate-cache-button'

const DEV_EMAILS = ['paulo.roriz01@gmail.com', 'paulo.german777@gmail.com']

interface HeaderStickProps {
  userEmail?: string | null
}

const HeaderStick = ({ userEmail }: HeaderStickProps) => {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return

    let lastScrollTop = 0

    const handleScroll = () => {
      const scrollTop = main.scrollTop
      setHidden(scrollTop > 50 && scrollTop > lastScrollTop)
      lastScrollTop = scrollTop
    }

    main.addEventListener('scroll', handleScroll, { passive: true })
    return () => main.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'absolute right-8 top-0 z-50 transition-transform duration-300',
        hidden && '-translate-y-full',
      )}
    >
      <div className="flex items-center justify-center gap-1 rounded-b-xl bg-secondary/50 px-1 py-1 transition-all hover:bg-secondary/90">
        {userEmail && DEV_EMAILS.includes(userEmail) && <RevalidateCacheButton />}
        <GlobalSearch />
        <ThemeToggle />
      </div>
    </header>
  )
}

export default HeaderStick
