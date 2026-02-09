'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { SidebarItem } from '@/_components/layout/sidebar-item'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { SignOutButton } from '@/_components/auth/sign-out-button'
import { useSidebar } from '@/_providers/sidebar-provider'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'

export const AppSidebar = () => {
  const { isCollapsed, toggle } = useSidebar()
  const params = useParams()
  const orgSlug = params?.orgSlug as string | undefined

  // Função para construir links com org prefix
  const buildHref = (path: string) => {
    if (orgSlug) {
      return `/org/${orgSlug}${path}`
    }
    return path
  }

  return (
    <aside
      className={cn(
        'relative hidden h-screen flex-col border-r border-border/50 bg-secondary/20 text-card-foreground transition-all duration-500 ease-in-out md:flex',
        isCollapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] flex h-16 items-center border-b border-border/50 transition-[padding] duration-700',
          isCollapsed ? 'pl-6 pr-0' : 'px-6',
        )}
      >
        <Link
          href={buildHref('/dashboard')}
          className="flex items-center gap-2 font-bold text-foreground"
        >
          <KronosLogo />
          <span
            className={cn(
              'ease-[cubic-bezier(0.25,0.76,0.35,1)] overflow-hidden whitespace-nowrap text-xl font-bold tracking-tight transition-all duration-700',
              isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 delay-100',
            )}
          >
            KRONOS
          </span>
        </Link>
      </div>

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

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className={cn('grid gap-1', isCollapsed ? 'px-2' : 'px-4')}>
          <SidebarItem href={buildHref('/dashboard')}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </SidebarItem>

          <SidebarItem href={buildHref('/contacts')}>
            <Users className="h-4 w-4" />
            Contatos
          </SidebarItem>

          <SidebarItem href={buildHref('/tasks')}>
            <CheckSquare className="h-4 w-4" />
            Tarefas
          </SidebarItem>

          <SidebarItem href={buildHref('/pipeline')}>
            <Kanban className="h-4 w-4" />
            Pipeline
          </SidebarItem>
        </nav>
      </div>

      {/* Footer */}
      <div
        className={cn(
          'overflow-y-auto border-t border-border/50 p-4',
          isCollapsed ? 'px-2' : 'px-4',
        )}
      >
        <nav className="grid gap-2">
          <SidebarItem href={buildHref('/settings')}>
            <Settings className="h-4 w-4" />
            Configurações
          </SidebarItem>
        </nav>
        <SignOutButton isCollapsed={isCollapsed} />
      </div>
    </aside>
  )
}
