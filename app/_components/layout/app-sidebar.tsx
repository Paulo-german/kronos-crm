'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Package,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { SidebarItem } from '@/_components/layout/sidebar-item'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { SignOutButton } from '@/_components/auth/sign-out-button'
import { useSidebar } from '@/_providers/sidebar-provider'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

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
        'hidden h-screen flex-col border-r border-border/50 bg-secondary/20 text-card-foreground transition-all duration-300 ease-in-out md:flex',
        isCollapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex h-16 items-center justify-between border-b border-border/50',
          isCollapsed ? 'justify-center px-2' : 'px-6',
        )}
      >
        <Link
          href={buildHref('/dashboard')}
          className="flex items-center gap-2 font-bold text-foreground"
        >
          <KronosLogo />
          {!isCollapsed && (
            <span className="text-xl font-bold tracking-tight">KRONOS</span>
          )}
        </Link>

        {/* Toggle Button */}
        <div
          className={cn(
            'mt-4',
            isCollapsed
              ? 'absolute left-[5.5rem] top-0 flex justify-center'
              : 'top-0 mt-0',
          )}
        >
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              >
                {isCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCollapsed ? 'right' : 'top'}>
              {isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            </TooltipContent>
          </Tooltip>
        </div>
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

          <SidebarItem href={buildHref('/products')}>
            <Package className="h-4 w-4" />
            Produtos
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
          'border-t border-border/50 p-4',
          isCollapsed && 'flex flex-col items-center px-2',
        )}
      >
        <nav className={cn('grid gap-2', isCollapsed && 'w-full')}>
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
