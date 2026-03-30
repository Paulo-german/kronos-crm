'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSidebar } from '@/_providers/sidebar-provider'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import { SidebarContent } from '@/_components/layout/sidebar-content'
import type { ModuleSlug } from '@/_data-access/module/types'
import type { MemberRole } from '@prisma/client'

interface AppSidebarProps {
  activeModules?: ModuleSlug[]
  organizations?: { id: string; name: string; slug: string; role: MemberRole }[]
  isSuperAdmin?: boolean
  credits?: { available: number; monthlyLimit: number; orgSlug: string }
}

export const AppSidebar = ({
  activeModules = [],
  organizations = [],
  isSuperAdmin = false,
  credits,
}: AppSidebarProps) => {
  const { isCollapsed, toggle } = useSidebar()

  return (
    <aside
      className={cn(
        'relative hidden h-full flex-col border-r border-border/50 bg-secondary/20 text-card-foreground transition-all duration-500 ease-in-out md:flex',
        isCollapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      {/* Floating Toggle Button */}
      <div className="absolute -right-3 top-1/2 z-20 hidden -translate-y-1/2 md:flex">
        <Button
          variant="outline"
          size="icon"
          onClick={toggle}
          className="h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent hover:text-accent-foreground"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      <SidebarContent
        activeModules={activeModules}
        organizations={organizations}
        isSuperAdmin={isSuperAdmin}
        credits={credits}
      />
    </aside>
  )
}
