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
  dataTour?: string
}

export const SidebarItem = ({ href, label, badge, icon, dataTour }: SidebarItemProps) => {
  const pathname = usePathname()
  const { isCollapsed, isAnimating } = useSidebar()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Tooltip delayDuration={300} open={!isCollapsed || isAnimating ? false : undefined}>
      <TooltipTrigger asChild>
        <Link
          href={href}
          data-tour={dataTour}
          className={cn(
            'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex items-center rounded-md py-2 text-sm font-medium transition-all duration-500 hover:bg-primary/10 hover:text-primary',
            isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
            isCollapsed ? 'mx-2 px-3' : 'px-3',
            isAnimating && 'pointer-events-none',
          )}
        >
          <div className="flex items-center transition-transform duration-200 group-hover:scale-110">{icon}</div>
          <span
            className={cn(
              'ease-[cubic-bezier(0.25,0.76,0.35,1)] flex min-w-0 justify-between overflow-hidden whitespace-nowrap transition-all duration-1000',
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
      </TooltipTrigger>
      {isCollapsed && (
        <TooltipContent side="right" sideOffset={10} className="flex items-center gap-2 px-3 py-2 shadow-none">
          <span className="text-white/60 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
          <span className="font-medium">{label}</span>
        </TooltipContent>
      )}
    </Tooltip>
  )
}
