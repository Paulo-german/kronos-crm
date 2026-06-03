'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/_lib/utils'

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  exact?: boolean
}

export const NavItem = ({ href, icon, label, exact = false }: NavItemProps) => {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        'ease-[cubic-bezier(0.25,0.76,0.35,1)] flex h-9 items-center rounded-md text-sm font-medium transition-colors hover:bg-white/10 hover:text-white dark:hover:bg-primary/10 dark:hover:text-primary',
        isActive ? 'bg-white/15 text-white dark:bg-primary/10 dark:text-primary' : 'text-primary dark:text-muted-foreground',
      )}
    >
      <div className="flex w-12 shrink-0 items-center justify-center">{icon}</div>
      <span className="ease-[cubic-bezier(0.25,0.76,0.35,1)] max-w-0 overflow-hidden whitespace-nowrap pr-3 opacity-0 transition-all duration-300 group-hover/sidebar:max-w-[180px] group-hover/sidebar:opacity-100">
        {label}
      </span>
    </Link>
  )
}
