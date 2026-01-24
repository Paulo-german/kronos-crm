'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/_lib/utils'

interface SidebarItemProps {
  href: string
  children: React.ReactNode
}

export const SidebarItem = ({ href, children }: SidebarItemProps) => {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-primary/10 hover:text-primary',
        isActive
          ? 'bg-primary/15 text-primary shadow-[0_0_20px_-10px_var(--color-kronos-purple)]'
          : 'text-muted-foreground',
      )}
    >
      {children}
    </Link>
  )
}
