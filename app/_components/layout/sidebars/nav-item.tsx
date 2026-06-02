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
        'flex h-9 items-center rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
      )}
    >
      <div className="shrink-0">{icon}</div>
      <span className="ml-3 overflow-hidden whitespace-nowrap opacity-0 transition-opacity delay-100 duration-150 group-hover/sidebar:opacity-100">
        {label}
      </span>
    </Link>
  )
}
