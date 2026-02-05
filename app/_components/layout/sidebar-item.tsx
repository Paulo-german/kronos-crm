'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/_lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { useSidebar } from '@/_providers/sidebar-provider'

interface SidebarItemProps {
  href: string
  children: React.ReactNode
}

export const SidebarItem = ({ href, children }: SidebarItemProps) => {
  const pathname = usePathname()
  const { isCollapsed } = useSidebar()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  // Extract icon and label from children
  const childArray = Array.isArray(children) ? children : [children]
  const icon = childArray[0]
  const label = childArray.slice(1)

  const linkContent = (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-primary/10 hover:text-primary',
        isActive
          ? 'bg-primary/15 text-primary shadow-[0_0_20px_-10px_var(--color-kronos-purple)]'
          : 'text-muted-foreground',
        isCollapsed && 'justify-center px-2',
      )}
    >
      {icon}
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
