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
import { Badge } from '../ui/badge'
import { CircleIcon } from 'lucide-react'

interface SidebarItemProps {
  href: string
  icon: React.ReactNode
  label: string
  badge?: string
}

export const SidebarItem = ({ href, label, badge, icon }: SidebarItemProps) => {
  const pathname = usePathname()
  const { isCollapsed } = useSidebar()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  const linkContent = (
    <Link
      href={href}
      className={cn(
        'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex items-center rounded-md py-2 pl-0 pr-0 text-sm font-medium transition-all duration-1000 hover:bg-primary/10 hover:text-primary',
        isActive
          ? 'bg-primary/15 text-primary shadow-[0_0_20px_-10px_var(--color-kronos-purple)]'
          : 'text-muted-foreground',
        isCollapsed ? 'ml-2 mr-2 pl-3 pr-0' : 'px-3',
      )}
    >
      <div className="flex items-center">{icon}</div>
      <span
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] flex justify-between overflow-hidden whitespace-nowrap transition-all duration-1000',
          isCollapsed ? 'w-0 opacity-0' : 'ml-3 w-full opacity-100 delay-100',
        )}
      >
        {label}
        {badge && (
          <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
            <span className="relative mr-2 flex">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <CircleIcon size={10} className="relative fill-primary" />
            </span>
            {badge}
          </Badge>
        )}
      </span>
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
